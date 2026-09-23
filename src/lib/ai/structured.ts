import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { LanguageModel, ModelMessage, TextStreamPart, ToolSet } from "ai";
import type { z } from "zod";
import type { CircuitBreaker } from "./breaker";
import { modelBreaker } from "./breaker";
import { languageModel } from "./providers";
import type { ModelEntry, ModelTarget } from "./registry";
import { errorStatus, isDailyQuotaError, ModelTimeoutError, shouldFallBack } from "./retry";

// Structured output for answer and extract calls (PLAN, Model registry: Reliability):
// streamed internally so a hung model is detected by our own first-output
// timer; one schema repair per model; one quick retry after a 5xx; the
// entry's fallback on timeout, daily quota, other failures or a failed
// repair; one total budget for primary and fallback; the caller's signal
// (the UI Stop button) ends everything. The caller receives the complete
// object once.

export interface CallBudget {
  /** No content-bearing chunk within this time counts as a hung model. */
  firstOutputMs: number;
  /** Overall budget for primary, repair and fallback together. */
  totalMs: number;
}

/** Placeholders until set from the measured P95 time to first token (PLAN, Open questions). */
export const ANSWER_BUDGET: CallBudget = { firstOutputMs: 10_000, totalMs: 60_000 };

/**
 * A chunk that carries model output: text (the JSON object streams as
 * text), reasoning or tool input. Stream metadata does not count.
 */
export function isFirstOutputChunk(chunk: TextStreamPart<ToolSet>): boolean {
  switch (chunk.type) {
    case "text-delta":
    case "reasoning-delta":
      return chunk.text.length > 0;
    case "tool-input-delta":
      return chunk.delta.length > 0;
    case "tool-call":
      return true;
    default:
      return false;
  }
}

/**
 * Why a raw model response fails a schema, as text for the model and for
 * diagnostics: the JSON parse error, or one line per zod issue.
 */
export function schemaIssues(schema: z.ZodType, text: string | undefined): string {
  let value: unknown;
  try {
    value = JSON.parse(text ?? "");
  } catch (error) {
    return `The response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
  const result = schema.safeParse(value);
  if (result.success) return "The response matches the schema.";
  return result.error.issues
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

export interface StructuredRequest<T> {
  schema: z.ZodType<T>;
  name?: string;
  instructions?: string;
  prompt: string;
  /** Called when the first response fails the schema, before the repair call. */
  onRepair?: (issues: string, rawText: string | undefined) => void;
}

export interface StructuredResult<T> {
  output: T;
  /** True when the first response failed the schema and the repair call fixed it. */
  repaired: boolean;
}

export interface AttemptOptions {
  /** Aborts the attempt: the caller's Stop and the total budget. */
  signal?: AbortSignal;
  /** First-output limit per model call; none when omitted (measurement only). */
  firstOutputMs?: number;
  /** Time from the start of a model call to its first content-bearing chunk. */
  onFirstOutput?: (ms: number) => void;
}

/** One streamed model call. Throws the signal's reason when aborted, a `ModelTimeoutError` when no output arrives in time. */
async function streamOnce<T>(
  model: LanguageModel,
  request: StructuredRequest<T>,
  messages: ModelMessage[],
  options: AttemptOptions,
): Promise<T> {
  const { signal, firstOutputMs, onFirstOutput } = options;
  const firstOutput = new AbortController();
  let timer =
    firstOutputMs === undefined
      ? undefined
      : setTimeout(() => firstOutput.abort(new ModelTimeoutError("first-output", firstOutputMs)), firstOutputMs);
  const stopTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const started = performance.now();
  let outputSeen = false;
  let streamError: unknown;

  try {
    const result = streamText({
      model,
      instructions: request.instructions,
      messages,
      output: Output.object({ schema: request.schema, name: request.name }),
      maxRetries: 0,
      abortSignal: signal ? AbortSignal.any([signal, firstOutput.signal]) : firstOutput.signal,
      onChunk: ({ chunk }) => {
        if (outputSeen || !isFirstOutputChunk(chunk)) return;
        outputSeen = true;
        stopTimer();
        onFirstOutput?.(performance.now() - started);
      },
      onError: ({ error }) => {
        streamError ??= error;
      },
    });
    const output = await result.output;
    if (streamError !== undefined) throw streamError;
    return output;
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (firstOutput.signal.aborted) throw firstOutput.signal.reason;
    throw streamError ?? error;
  } finally {
    stopTimer();
  }
}

/**
 * Structured output with one repair attempt: when the response fails the
 * schema, the model gets its own response and the zod issues back and one
 * chance to correct it. A second failure throws the SDK's
 * `NoObjectGeneratedError`. Timeouts and other errors are never repaired.
 */
export async function generateWithRepair<T>(
  model: LanguageModel,
  request: StructuredRequest<T>,
  options: AttemptOptions = {},
): Promise<StructuredResult<T>> {
  const question: ModelMessage = { role: "user", content: request.prompt };
  try {
    return { output: await streamOnce(model, request, [question], options), repaired: false };
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw error;
    const issues = schemaIssues(request.schema, error.text);
    request.onRepair?.(issues, error.text);
    const output = await streamOnce(
      model,
      request,
      [
        question,
        { role: "assistant", content: error.text ?? "" },
        {
          role: "user",
          content: `Your previous response did not match the required schema:\n${issues}\nReturn the corrected JSON object only, following the rules for its kind.`,
        },
      ],
      options,
    );
    return { output, repaired: true };
  }
}

/** A server error that arrived before the first-output limit, as opposed to a timeout. */
function isServerError(error: unknown): boolean {
  if (error instanceof ModelTimeoutError) return false;
  const status = errorStatus(error);
  return status !== undefined && status >= 500;
}

/** Failures the circuit breaker counts: timeouts and 5xx. */
function isBreakerFailure(error: unknown): boolean {
  return error instanceof ModelTimeoutError || isServerError(error);
}

/** Waits `ms`, or rejects with the signal's reason when it aborts first. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export interface RunOptions {
  /** The caller's abort signal (the UI Stop button). An abort ends the call without fallback. */
  signal?: AbortSignal;
  budget?: CallBudget;
  breaker?: CircuitBreaker;
  /** Builds the SDK model for a target; tests pass mocks. */
  modelFor?: (target: ModelTarget) => LanguageModel;
  /** Upper bound of the random wait before the one retry after a 5xx. */
  retryJitterMs?: number;
  onFallback?: (error: unknown, fallback: ModelTarget) => void;
}

export interface RunResult<T> extends StructuredResult<T> {
  target: ModelTarget;
  fellBack: boolean;
}

/**
 * An answer or extract call for a registry entry, within one total budget:
 * - timeout: no retry, straight to the fallback;
 * - 5xx: one retry on the same model after at most `retryJitterMs`, then
 *   the fallback;
 * - daily quota (429 free-models-per-day): no retry, the fallback, and the
 *   entry's breaker opens at once;
 * - other transient failures, an unavailable model or a failed repair: the
 *   fallback.
 * While the entry's breaker is open the primary is skipped.
 */
export async function runStructured<T>(
  entry: ModelEntry,
  request: StructuredRequest<T>,
  options: RunOptions = {},
): Promise<RunResult<T>> {
  const {
    signal,
    budget = ANSWER_BUDGET,
    breaker = modelBreaker,
    modelFor = languageModel,
    retryJitterMs = 1_000,
  } = options;
  const total = new AbortController();
  const totalTimer = setTimeout(() => total.abort(new ModelTimeoutError("total", budget.totalMs)), budget.totalMs);
  const combined = signal ? AbortSignal.any([signal, total.signal]) : total.signal;
  const attempt: AttemptOptions = { signal: combined, firstOutputMs: budget.firstOutputMs };

  /** One model, with the single quick retry after a 5xx. Breaker bookkeeping only for the primary. */
  const tryModel = async (target: ModelTarget, isPrimary: boolean): Promise<StructuredResult<T>> => {
    for (let retried = false; ; retried = true) {
      try {
        return await generateWithRepair(modelFor(target), request, attempt);
      } catch (error) {
        if (combined.aborted) throw error;
        if (isPrimary && isDailyQuotaError(error)) breaker.trip(entry.id);
        else if (isPrimary && isBreakerFailure(error)) breaker.recordFailure(entry.id);
        if (retried || !isServerError(error)) throw error;
        await delay(Math.random() * retryJitterMs, combined);
      }
    }
  };

  try {
    const fallback = entry.fallback;
    if (!fallback || !breaker.isOpen(entry.id)) {
      try {
        const result = await tryModel(entry, true);
        breaker.recordSuccess(entry.id);
        return { ...result, target: entry, fellBack: false };
      } catch (error) {
        if (signal?.aborted) throw error;
        if (!fallback || total.signal.aborted || !shouldFallBack(error)) throw error;
        options.onFallback?.(error, fallback);
      }
    }
    const result = await tryModel(fallback, false);
    return { ...result, target: fallback, fellBack: true };
  } finally {
    clearTimeout(totalTimer);
  }
}
