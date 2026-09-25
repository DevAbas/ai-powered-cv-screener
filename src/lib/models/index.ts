// The models module (AGENTS.md, Conventions): the language models and how
// they are called, imported from `@/lib/models`. Names are
// listed, not `export *`: the scripts run as ES modules and Node only sees
// the names a CommonJS module declares itself.
// `modelProviders.ts`, `embedder.ts` and `structuredOutput.ts` are not here: they
// build SDK clients from the environment, and this index is imported by
// client components; server code imports them by their path.

export { CircuitBreaker, modelBreaker } from "./circuitBreaker";
export type { BreakerOptions } from "./circuitBreaker";

export { REGISTRY, getEntry, answerEntries, answerEntry, recommendedEntry } from "./modelRegistry";
export type { Provider, Vendor, ModelId, Tier, Capabilities, ModelTarget, ModelEntry } from "./modelRegistry";

export { ModelTimeoutError, errorStatus, isServerError, isDailyQuotaError, isRetryable, retryAfterMs, withRetry, shouldFallBack, delay } from "./modelRetry";
export type { RetryOptions } from "./modelRetry";

export { modelKey, modelRoute, runRoute } from "./modelRouting";
export type { RouteOptions, RouteResult } from "./modelRouting";
