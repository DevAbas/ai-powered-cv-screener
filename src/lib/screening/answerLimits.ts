// Every tunable of the answering service in one place.

/** Model steps per question: tool steps, then the step with the answer and `present`; one more for a correction. */
export const STEP_LIMIT = 3;

/**
 * The AI SDK's timeouts (stream-text reference: `timeout`). Generous until
 * the evaluation measures the P95 per step; then P95 × 2.
 */
export const TIMEOUTS = { totalMs: 120_000, stepMs: 60_000, firstChunkMs: 30_000, toolMs: 15_000 } as const;
