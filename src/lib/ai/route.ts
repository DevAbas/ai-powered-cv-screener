import type { CircuitBreaker } from "./breaker";
import type { ModelEntry, ModelTarget } from "./registry";
import { errorStatus, isDailyQuotaError, isServerError, ModelTimeoutError } from "./retry";

// Which models a call tries, in what order, and what the circuit breaker
// learns from each (PLAN, Reliability). The breaker tracks models rather
// than entries: answers and extraction share what they learn about a
// model, and a fallback that has spent its daily allowance is passed over
// by every entry that has it.

/** A model's key in the circuit breaker. */
export function modelKey(target: ModelTarget): string {
  return `${target.provider}:${target.model}`;
}

/**
 * The entry's model, then its fallback. While the model's breaker is open,
 * only the fallback. While the fallback's is open (its daily quota spent,
 * say), only the model: it is never skipped for a fallback that cannot
 * answer.
 */
export function modelRoute(entry: ModelEntry, breaker: CircuitBreaker): ModelTarget[] {
  const { fallback } = entry;
  if (!fallback || breaker.isOpen(modelKey(fallback))) return [entry];
  return breaker.isOpen(modelKey(entry)) ? [fallback] : [entry, fallback];
}

/** Timeouts and 5xx count against a model; a spent free quota or an exhausted account (402) opens its breaker at once. */
function recordFailure(breaker: CircuitBreaker, target: ModelTarget, error: unknown): void {
  if (isDailyQuotaError(error) || errorStatus(error) === 402) breaker.trip(modelKey(target));
  else if (error instanceof ModelTimeoutError || isServerError(error)) breaker.recordFailure(modelKey(target));
}

export interface RouteOptions<T> {
  breaker: CircuitBreaker;
  /** The caller's Stop and the total budget: once it aborts, no other model is tried. */
  signal: AbortSignal;
  /** One call on one model, with that model's own retries; `next` is the model after it, if any. */
  run: (target: ModelTarget, next: ModelTarget | undefined) => Promise<T>;
  /** Whether another model might succeed where this error failed. */
  canSwitch: (error: unknown) => boolean;
  /** Every model failure, in order; `next` is the model that takes over, if any. */
  onFailure?: (error: unknown, target: ModelTarget, next: ModelTarget | undefined) => void;
}

export interface RouteResult<T> {
  value: T;
  target: ModelTarget;
  /** A model other than the entry's own answered. */
  fellBack: boolean;
}

/**
 * Tries the route until a model succeeds. When every model fails, the
 * entry's own failure is thrown: a fallback's failure, such as its spent
 * daily quota, would misdescribe what went wrong.
 */
export async function runRoute<T>(entry: ModelEntry, options: RouteOptions<T>): Promise<RouteResult<T>> {
  const { breaker, signal, run, canSwitch, onFailure } = options;
  const route = modelRoute(entry, breaker);
  let failure: unknown;
  for (const [i, target] of route.entries()) {
    const next = route[i + 1];
    try {
      const value = await run(target, next);
      breaker.recordSuccess(modelKey(target));
      return { value, target, fellBack: target !== entry };
    } catch (error) {
      if (signal.aborted) throw error;
      recordFailure(breaker, target, error);
      const switching = canSwitch(error);
      onFailure?.(error, target, switching ? next : undefined);
      // An error no other model can help with (text already shown, a bad request) ends the call as it is.
      if (!switching) throw error;
      if (failure === undefined || target === entry) failure = error;
      if (!next) throw failure;
    }
  }
  throw failure;
}
