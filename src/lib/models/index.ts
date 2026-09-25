// The models module (AGENTS.md, Conventions): the language models and how
// they are called, imported from `@/lib/models`. Names are
// listed, not `export *`: the scripts run as ES modules and Node only sees
// the names a CommonJS module declares itself.
// `modelProviders.ts`, `embedder.ts` and `structuredOutput.ts` are not here: they
// build SDK clients; server code imports them by their path.

export { CircuitBreaker, modelBreaker } from "./circuitBreaker";
export type { BreakerOptions } from "./circuitBreaker";

export { REGISTRY } from "./modelRegistry";
export type { Provider, ModelId, ModelVar, Tier, Capabilities, ModelTarget, ModelSlot, ModelEntry } from "./modelRegistry";

export { modelName, getEntry } from "./modelEnv";

export { ModelTimeoutError, errorStatus, isServerError, isDailyQuotaError, isRetryable, retryAfterMs, withRetry, shouldFallBack, delay } from "./modelRetry";
export type { RetryOptions } from "./modelRetry";

export { modelKey, modelRoute, runRoute } from "./modelRouting";
export type { RouteOptions, RouteResult } from "./modelRouting";
