import { streamText } from "ai";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import type { CircuitBreaker } from "./breaker";
import { modelBreaker } from "./breaker";
import { languageModel } from "./providers";
import type { ModelEntry, ModelTarget } from "./registry";
import { isServerError, ModelTimeoutError, shouldFallBack } from "./retry";
import { runRoute } from "./route";
import type { CallBudget } from "./structured";
import { ANSWER_BUDGET, delay, isFirstOutputChunk } from "./structured";

// Streams a free-text answer for a registry entry (PLAN, Model registry:
// Reliability). Until the first word reaches the recruiter, a 5xx gets one
// more try on the same model, and a model silent past the first-output limit
// hands over to the next model on the route (route.ts). The last model has
// nothing to hand over to, so it waits for the total budget: under load the
// Gemini free tier holds a request for 20 s and more, then answers at once.
// After the first word, switching models would mix two answers, so a failure
// ends the answer with an error instead. Tools without `execute` may be
// offered: the model's first valid call comes back with the text, and the
// run ends after that one step.

export interface StreamTextRequest {
  instructions: string;
  messages: ModelMessage[];
  /** Tools the model may call, none with an `execute`. */
  tools?: ToolSet;
}

/** A tool call whose input passed the tool's schema. */
export interface StreamedToolCall {
  toolName: string;
  input: unknown;
}

interface StreamedAnswer {
  text: string;
  toolCall?: StreamedToolCall;
}

export interface StreamTextOptions {
  /** Called with each piece of text as it arrives. */
  onDelta: (text: string) => void;
  /** The caller's abort signal (Stop, or the client leaving). Ends the call without fallback. */
  signal?: AbortSignal;
  budget?: CallBudget;
  breaker?: CircuitBreaker;
  /** Builds the SDK model for a target; tests pass mocks. */
  modelFor?: (target: ModelTarget) => LanguageModel;
  /** Upper bound of the random wait before the retry after a 5xx. */
  retryJitterMs?: number;
  /** A model returned a 5xx before its first word and is tried once more. */
  onRetry?: (error: unknown, target: ModelTarget) => void;
  /** A model failed; `next` takes over when there is one. */
  onFailure?: (error: unknown, target: ModelTarget, next: ModelTarget | undefined) => void;
}

export interface StreamTextResult extends StreamedAnswer {
  target: ModelTarget;
  fellBack: boolean;
}

/** The model returned neither text nor a tool call. */
export class EmptyAnswerError extends Error {
  constructor() {
    super("The model returned no text");
    this.name = "EmptyAnswerError";
  }
}

/** The answer had started streaming when the model failed; no retry or fallback is possible. */
export class StreamInterruptedError extends Error {
  constructor(options: { cause: unknown }) {
    super("The answer stopped part-way", options);
    this.name = "StreamInterruptedError";
  }
}

interface AttemptOptions {
  signal: AbortSignal;
  /** No limit: the call waits as long as `signal` allows. */
  firstOutputMs: number | undefined;
  onDelta: (text: string) => void;
}

/** One streamed call. Throws the signal's reason when aborted, `ModelTimeoutError` when nothing arrives in time. */
async function streamOnce(model: LanguageModel, request: StreamTextRequest, { signal, firstOutputMs, onDelta }: AttemptOptions): Promise<StreamedAnswer> {
  const firstOutput = new AbortController();
  const timer =
    firstOutputMs === undefined
      ? undefined
      : setTimeout(() => firstOutput.abort(new ModelTimeoutError("first-output", firstOutputMs)), firstOutputMs);
  const aborted = AbortSignal.any([signal, firstOutput.signal]);
  let text = "";
  let toolCall: StreamedToolCall | undefined;
  try {
    const result = streamText({
      model,
      instructions: request.instructions,
      messages: request.messages,
      tools: request.tools,
      maxRetries: 0,
      abortSignal: aborted,
      // Errors reach the caller through the stream; the SDK's own console dump would repeat each one.
      onError: () => {},
    });
    for await (const part of result.stream) {
      if (isFirstOutputChunk(part)) clearTimeout(timer);
      if (part.type === "text-delta" && part.text) {
        text += part.text;
        onDelta(part.text);
      } else if (part.type === "tool-call" && !part.invalid) {
        // One view per answer: the first valid call wins. An invalid one also arrives as a `tool-error` part, ignored.
        toolCall ??= { toolName: part.toolName, input: part.input };
      } else if (part.type === "error") throw part.error;
    }
    // An abort ends the stream quietly rather than throwing: treat it as the failure it is.
    if (aborted.aborted) throw aborted.reason;
  } catch (error) {
    if (signal.aborted && !text) throw signal.reason;
    const cause = firstOutput.signal.aborted ? firstOutput.signal.reason : signal.aborted ? signal.reason : error;
    throw text ? new StreamInterruptedError({ cause }) : cause;
  } finally {
    clearTimeout(timer);
  }
  if (!text.trim() && !toolCall) throw new EmptyAnswerError();
  return { text, toolCall };
}

/** A failure another model may not share. Text already on screen is never switched. */
function canSwitch(error: unknown): boolean {
  return error instanceof EmptyAnswerError || shouldFallBack(error);
}

/** Streams the answer from the first model on the entry's route that gives one. */
export async function streamAnswerText(entry: ModelEntry, request: StreamTextRequest, options: StreamTextOptions): Promise<StreamTextResult> {
  const { onDelta, budget = ANSWER_BUDGET, breaker = modelBreaker, modelFor = languageModel, retryJitterMs = 1_000 } = options;
  const total = new AbortController();
  const totalTimer = setTimeout(() => total.abort(new ModelTimeoutError("total", budget.totalMs)), budget.totalMs);
  const signal = options.signal ? AbortSignal.any([options.signal, total.signal]) : total.signal;

  /** One model, tried once more after a 5xx while nothing has been shown; the last on the route has no first-output limit. */
  const run = async (target: ModelTarget, next: ModelTarget | undefined): Promise<StreamedAnswer> => {
    const firstOutputMs = next ? budget.firstOutputMs : undefined;
    for (let retried = false; ; retried = true) {
      try {
        return await streamOnce(modelFor(target), request, { signal, firstOutputMs, onDelta });
      } catch (error) {
        if (retried || signal.aborted || !isServerError(error)) throw error;
        options.onRetry?.(error, target);
        await delay(Math.random() * retryJitterMs, signal);
      }
    }
  };

  try {
    const { value, target, fellBack } = await runRoute(entry, { breaker, signal, run, canSwitch, onFailure: options.onFailure });
    return { ...value, target, fellBack };
  } finally {
    clearTimeout(totalTimer);
  }
}
