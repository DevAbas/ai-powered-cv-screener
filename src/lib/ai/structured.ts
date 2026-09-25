import { NoObjectGeneratedError, Output, streamText } from "ai";
import type { LanguageModel, ModelMessage, TextStreamPart, ToolSet } from "ai";
import type { z } from "zod";
import type { CircuitBreaker } from "./breaker";
import { modelBreaker } from "./breaker";
import { languageModel } from "./providers";
import type { ModelEntry, ModelTarget } from "./registry";
import { delay, isServerError, ModelTimeoutError, shouldFallBack } from "./retry";
import { runRoute } from "./route";

// Structured output for the scripts that still use it, extraction and seed
// generation (PLAN, Reliability: schema repair): streamed internally so a
// hung model is detected by a first-output timer; one schema repair per
// model; one quick retry after a 5xx; the next model on the route
// (route.ts) on timeout, daily quota, other failures or a failed repair;
// one total budget for all models; the caller's signal ends everything.
// The caller receives the complete object once.

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
  /** The model's default when unset. */
  temperature?: number;
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
  /** First-output limit per model call; none when omitted. */
  firstOutputMs?: number;
}

/** One streamed model call. Throws the signal's reason when aborted, a `ModelTimeoutError` when no output arrives in time. */
async function streamOnce<T>(
  model: LanguageModel,
  request: StructuredRequest<T>,
  messages: ModelMessage[],
  options: AttemptOptions,
): Promise<T> {
  const { signal, firstOutputMs } = options;
  const firstOutput = new AbortController();
  let timer =
    firstOutputMs === undefined
      ? undefined
      : setTimeout(() => firstOutput.abort(new ModelTimeoutError("first-output", firstOutputMs)), firstOutputMs);
  const stopTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  let outputSeen = false;
  let streamError: unknown;

  try {
    const result = streamText({
      model,
      instructions: request.instructions,
      messages,
      output: Output.object({ schema: request.schema, name: request.name }),
      temperature: request.temperature,
      maxRetries: 0,
      abortSignal: signal ? AbortSignal.any([signal, firstOutput.signal]) : firstOutput.signal,
      onChunk: ({ chunk }) => {
        if (outputSeen || !isFirstOutputChunk(chunk)) return;
        outputSeen = true;
        stopTimer();
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

export interface RunOptions {
  /** The caller's abort signal (the UI Stop button). An abort ends the call without fallback. */
  signal?: AbortSignal;
  budget?: CallBudget;
  breaker?: CircuitBreaker;
  /** Builds the SDK model for a target; tests pass mocks. */
  modelFor?: (target: ModelTarget) => LanguageModel;
  /** Upper bound of the random wait before the one retry after a 5xx. */
  retryJitterMs?: number;
  /** A model failed and `next`, the next on the route, takes over. */
  onFallback?: (error: unknown, next: ModelTarget) => void;
}

export interface RunResult<T> extends StructuredResult<T> {
  target: ModelTarget;
  fellBack: boolean;
}

/**
 * An extract or seed call for a registry entry, on its route (route.ts),
 * within one total budget:
 * - timeout: no retry, straight to the next model;
 * - 5xx: one retry on the same model after at most `retryJitterMs`, then
 *   the next model;
 * - daily quota (429 free-models-per-day): no retry, the next model, and
 *   the model's breaker opens at once;
 * - other transient failures, an unavailable model or a failed repair: the
 *   next model.
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

  /** One model, with the single quick retry after a 5xx: the two are one strike for the breaker. */
  const run = async (target: ModelTarget): Promise<StructuredResult<T>> => {
    for (let retried = false; ; retried = true) {
      try {
        return await generateWithRepair(modelFor(target), request, attempt);
      } catch (error) {
        if (retried || combined.aborted || !isServerError(error)) throw error;
        await delay(Math.random() * retryJitterMs, combined);
      }
    }
  };

  try {
    const { value, target, fellBack } = await runRoute(entry, {
      breaker,
      signal: combined,
      run,
      canSwitch: shouldFallBack,
      onFailure: (error, _target, next) => {
        if (next) options.onFallback?.(error, next);
      },
    });
    return { ...value, target, fellBack };
  } finally {
    clearTimeout(totalTimer);
  }
}
