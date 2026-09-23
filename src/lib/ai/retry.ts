import { APICallError, NoObjectGeneratedError, RetryError, StreamProviderError } from "ai";
import type { ModelEntry, ModelTarget } from "./registry";

// Failure classification, backoff and fallback around model calls. Calls
// wrapped here pass `maxRetries: 0` to the AI SDK so retries do not
// compound. The interactive answer path (structured.ts) never retries the
// same model; backoff is for scripts.

/** A model produced no output in time (`first-output`), or the whole call ran out of budget (`total`). */
export class ModelTimeoutError extends Error {
  constructor(
    readonly kind: "first-output" | "total",
    readonly ms: number,
  ) {
    super(kind === "first-output" ? `No output within ${ms} ms` : `No answer within the ${ms} ms budget`);
    this.name = "ModelTimeoutError";
  }
}

export interface RetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  baseMs?: number;
  maxMs?: number;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The error that actually failed: the last attempt inside an SDK `RetryError`. */
function innermost(error: unknown): unknown {
  return RetryError.isInstance(error) ? error.lastError : error;
}

function apiCallError(error: unknown): APICallError | undefined {
  const inner = innermost(error);
  return APICallError.isInstance(inner) ? inner : undefined;
}

/**
 * The HTTP status that describes the failure. OpenRouter can report an
 * upstream failure inside an HTTP 200 body; the SDK then throws an
 * `APICallError` with `statusCode: 200` and the real code in `data.code`.
 * Mid-stream failures arrive as `StreamProviderError`.
 */
export function errorStatus(error: unknown): number | undefined {
  const inner = innermost(error);
  if (StreamProviderError.isInstance(inner)) return inner.statusCode;
  const api = apiCallError(inner);
  if (!api) return undefined;
  if (api.statusCode === 200 && typeof api.data === "object" && api.data !== null && "code" in api.data) {
    const code = Number(api.data.code);
    if (Number.isInteger(code)) return code;
  }
  return api.statusCode;
}

/**
 * OpenRouter's daily cap on free-model requests. Retrying cannot succeed
 * until the next day, so the entry's breaker opens at once.
 */
export function isDailyQuotaError(error: unknown): boolean {
  if (errorStatus(error) !== 429) return false;
  const api = apiCallError(error);
  const text = [
    error instanceof Error ? error.message : "",
    api?.message,
    api?.responseBody,
    api?.data === undefined ? "" : JSON.stringify(api.data),
  ].join(" ");
  return /free-models-per-day/i.test(text);
}

/** Same classification as the AI SDK: 408, 409, 429 and 5xx. */
function isRetryableStatus(status: number | undefined): boolean {
  return status === 408 || status === 409 || status === 429 || (status !== undefined && status >= 500);
}

/** True for transient failures: 408, 409, 429 and 5xx, whether at call start, in a 200 body or mid-stream. */
export function isRetryable(error: unknown): boolean {
  if (RetryError.isInstance(error) && error.reason === "abort") return false;
  const inner = innermost(error);
  if (StreamProviderError.isInstance(inner)) return inner.isRetryable;
  const api = apiCallError(inner);
  return api ? api.isRetryable || isRetryableStatus(errorStatus(api)) : false;
}

/** The server's requested wait, from `retry-after-ms` or `retry-after`. */
export function retryAfterMs(error: unknown): number | undefined {
  const headers = apiCallError(error)?.responseHeaders;
  if (!headers) return undefined;
  const ms = Number(headers["retry-after-ms"]);
  if (Number.isFinite(ms) && ms >= 0) return ms;
  const value = headers["retry-after"];
  if (value === undefined) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 5, baseMs = 2000, maxMs = 60_000, onRetry, sleep = defaultSleep } = options;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      const backoff = baseMs * 2 ** (attempt - 1) * (1 + Math.random() * 0.2);
      const delayMs = Math.min(maxMs, retryAfterMs(error) ?? backoff);
      onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}

/**
 * Errors after which the fallback model is tried: a transient failure, no
 * output in time, the model is unavailable, or its output still failed the
 * schema after repair.
 */
export function shouldFallBack(error: unknown): boolean {
  if (isRetryable(error)) return true;
  if (error instanceof ModelTimeoutError && error.kind === "first-output") return true;
  if (NoObjectGeneratedError.isInstance(innermost(error))) return true;
  const status = errorStatus(error);
  return status === 402 || status === 404;
}

export interface FallbackOptions extends RetryOptions {
  onFallback?: (error: unknown, fallback: ModelTarget) => void;
}

/**
 * Runs `run` on the entry's model with retries, then on its `fallback` if
 * the primary is unavailable. Entries without `fallback` (such as `embed`)
 * never switch models.
 */
export async function withFallback<T>(
  entry: ModelEntry,
  run: (target: ModelTarget) => Promise<T>,
  options: FallbackOptions = {},
): Promise<T> {
  const { onFallback, ...retry } = options;
  try {
    return await withRetry(() => run(entry), retry);
  } catch (error) {
    const fallback = entry.fallback;
    if (!fallback || !shouldFallBack(error)) throw error;
    onFallback?.(error, fallback);
    return withRetry(() => run(fallback), retry);
  }
}
