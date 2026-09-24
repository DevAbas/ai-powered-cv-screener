import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, NoObjectGeneratedError, simulateReadableStream } from "ai";
import type { LanguageModel } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { AnswerSchema } from "@/contracts/answer";
import { CircuitBreaker } from "./breaker";
import type { ModelEntry, ModelTarget } from "./registry";
import { getEntry } from "./registry";
import { ModelTimeoutError } from "./retry";
import type { CallBudget, RunOptions } from "./structured";
import { generateWithRepair, isFirstOutputChunk, runStructured, schemaIssues } from "./structured";

const VALID = JSON.stringify({
  kind: "filter",
  summary: "Lena Novak has React.",
  candidates: [{ candidateId: "lena-novak", name: "Lena Novak", reason: "6 years of React", page: 1 }],
});
// The failure seen live: the candidate is named in the summary and `candidates` is missing.
const MISSING_CANDIDATES = JSON.stringify({ kind: "filter", summary: "Lena Novak" });

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** A streamed reply: the JSON text in one delta, after `delayMs`. */
function streamReply(text: string, delayMs = 0) {
  return {
    stream: simulateReadableStream({
      initialDelayInMs: delayMs,
      chunkDelayInMs: 0,
      chunks: [
        { type: "stream-start" as const, warnings: [] },
        { type: "text-start" as const, id: "t" },
        { type: "text-delta" as const, id: "t", delta: text },
        { type: "text-end" as const, id: "t" },
        { type: "finish" as const, finishReason: { unified: "stop" as const, raw: "stop" }, usage: USAGE },
      ],
    }),
  };
}

/** Reasoning first, then the JSON text; chunks arrive `chunkDelayMs` apart. */
function reasoningThenReply(text: string, chunkDelayMs: number) {
  return {
    stream: simulateReadableStream({
      initialDelayInMs: 0,
      chunkDelayInMs: chunkDelayMs,
      chunks: [
        { type: "stream-start" as const, warnings: [] },
        { type: "reasoning-start" as const, id: "r" },
        { type: "reasoning-delta" as const, id: "r", delta: "Checking the pages." },
        { type: "reasoning-end" as const, id: "r" },
        { type: "text-start" as const, id: "t" },
        { type: "text-delta" as const, id: "t", delta: text },
        { type: "text-end" as const, id: "t" },
        { type: "finish" as const, finishReason: { unified: "stop" as const, raw: "stop" }, usage: USAGE },
      ],
    }),
  };
}

function apiError(statusCode: number, message = `HTTP ${statusCode}`) {
  return new APICallError({ message, url: "https://example.com", requestBodyValues: {}, statusCode });
}

/** A model that throws the given errors in order, then streams VALID. */
function failingThen(...errors: Error[]) {
  let call = 0;
  return new MockLanguageModelV4({
    doStream: async () => {
      const error = errors[call++];
      if (error) throw error;
      return streamReply(VALID);
    },
  });
}

const DAILY_QUOTA = apiError(
  429,
  "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day",
);

function mockModel(...texts: string[]) {
  return new MockLanguageModelV4({ doStream: texts.map((text) => streamReply(text)) });
}

type Fetch = typeof globalThis.fetch;

/** The real OpenRouter provider over a fetch that stalls; `calls` counts requests. */
function stalledOpenRouter(mode: "after-headers" | "before-headers") {
  const calls = { count: 0 };
  const fetch: Fetch = (_input, init) => {
    calls.count++;
    const signal = init?.signal;
    if (mode === "before-headers") {
      return new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(signal.reason)));
    }
    const body = new ReadableStream({
      start(controller) {
        signal?.addEventListener("abort", () => controller.error(signal.reason));
      },
    });
    return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } }));
  };
  return { model: createOpenRouter({ apiKey: "test", fetch }).chat("vendor/model:free"), calls };
}

const fallbackTarget: ModelTarget = { provider: "google", vendor: "google", model: "fallback-model" };
const entry: ModelEntry = { ...getEntry("primary"), fallback: fallbackTarget };
const request = { schema: AnswerSchema, name: "answer", prompt: "Who has React?" };
const BUDGET: CallBudget = { firstOutputMs: 150, totalMs: 2_000 };

function run(primary: LanguageModel, fallback: LanguageModel, options: RunOptions = {}) {
  return runStructured(entry, request, {
    budget: BUDGET,
    breaker: new CircuitBreaker(),
    modelFor: (target) => (target.model === entry.model ? primary : fallback),
    ...options,
  });
}

async function timed<T>(promise: Promise<T>) {
  const started = performance.now();
  const settled = await promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  return { ...settled, ms: performance.now() - started };
}

describe("schemaIssues", () => {
  it("lists zod issues by path", () => {
    expect(schemaIssues(AnswerSchema, MISSING_CANDIDATES)).toBe('- candidates: Required for kind "filter"');
  });

  it("reports text that is not JSON", () => {
    expect(schemaIssues(AnswerSchema, "Lena Novak")).toMatch(/^The response is not valid JSON/);
  });
});

describe("isFirstOutputChunk", () => {
  it("counts text, reasoning and tool input, not stream metadata", () => {
    expect(isFirstOutputChunk({ type: "text-delta", id: "t", text: "{" })).toBe(true);
    expect(isFirstOutputChunk({ type: "reasoning-delta", id: "r", text: "Checking" })).toBe(true);
    expect(isFirstOutputChunk({ type: "tool-input-delta", id: "c", delta: "{" })).toBe(true);
    expect(isFirstOutputChunk({ type: "text-delta", id: "t", text: "" })).toBe(false);
    expect(isFirstOutputChunk({ type: "text-start", id: "t" })).toBe(false);
  });
});

describe("generateWithRepair", () => {
  it("returns a valid first response without a repair call", async () => {
    const model = mockModel(VALID);
    const result = await generateWithRepair(model, request);
    expect(result).toMatchObject({ repaired: false, output: { kind: "filter" } });
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it("sends the response and the zod issues back once, and returns the repaired output", async () => {
    const model = mockModel(MISSING_CANDIDATES, VALID);
    const onRepair = vi.fn();
    const result = await generateWithRepair(model, { ...request, onRepair });
    expect(result.repaired).toBe(true);
    expect(onRepair).toHaveBeenCalledWith('- candidates: Required for kind "filter"', MISSING_CANDIDATES);
    const repairPrompt = JSON.stringify(model.doStreamCalls[1]?.prompt);
    expect(repairPrompt).toContain("candidates: Required for kind");
  });

  it("throws the SDK error when the repair also fails", async () => {
    const model = mockModel(MISSING_CANDIDATES, MISSING_CANDIDATES);
    await expect(generateWithRepair(model, request)).rejects.toSatisfy(NoObjectGeneratedError.isInstance);
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it("does not repair errors that are not schema failures", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => {
        throw new APICallError({ message: "HTTP 400", url: "https://example.com", requestBodyValues: {}, statusCode: 400 });
      },
    });
    await expect(generateWithRepair(model, request)).rejects.toThrow("HTTP 400");
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it("reports the time to the first content-bearing chunk", async () => {
    const model = new MockLanguageModelV4({ doStream: streamReply(VALID, 60) });
    const onFirstOutput = vi.fn();
    await generateWithRepair(model, request, { onFirstOutput });
    expect(onFirstOutput).toHaveBeenCalledOnce();
    expect(onFirstOutput.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(50);
  });
});

describe("runStructured: timeouts and fallback", () => {
  it("A: headers then silence falls back within the first-output limit", async () => {
    const primary = stalledOpenRouter("after-headers");
    const result = await timed(run(primary.model, mockModel(VALID)));
    expect(result.ok && result.value.fellBack).toBe(true);
    expect(result.ms).toBeLessThan(BUDGET.firstOutputMs + 250);
  });

  it("B: no headers falls back within the first-output limit", async () => {
    const primary = stalledOpenRouter("before-headers");
    const result = await timed(run(primary.model, mockModel(VALID)));
    expect(result.ok && result.value.fellBack).toBe(true);
    expect(result.ms).toBeLessThan(BUDGET.firstOutputMs + 250);
  });

  it("reasoning clears the first-output timer", async () => {
    // Reasoning arrives at ~100 ms, the JSON text only after the 150 ms limit.
    const primary = new MockLanguageModelV4({ doStream: reasoningThenReply(VALID, 50) });
    const fallback = mockModel(VALID);
    const result = await run(primary, fallback);
    expect(result.fellBack).toBe(false);
    expect(fallback.doStreamCalls).toHaveLength(0);
  });

  it("does not retry the same model after a timeout", async () => {
    const primary = stalledOpenRouter("before-headers");
    await run(primary.model, mockModel(VALID));
    expect(primary.calls.count).toBe(1);
  });

  it("C: totalMs caps primary and fallback together", async () => {
    const budget = { firstOutputMs: 200, totalMs: 300 };
    const result = await timed(
      run(stalledOpenRouter("before-headers").model, stalledOpenRouter("after-headers").model, { budget }),
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatchObject({ name: "ModelTimeoutError", kind: "total" });
    expect(result.ms).toBeLessThan(budget.totalMs + 150);
  });

  it("a user abort ends the call without fallback", async () => {
    const fallback = mockModel(VALID);
    const stop = new AbortController();
    setTimeout(() => stop.abort(), 50);
    const result = await timed(run(stalledOpenRouter("after-headers").model, fallback, { signal: stop.signal }));
    expect(!result.ok && result.error).toMatchObject({ name: "AbortError" });
    expect(result.ms).toBeLessThan(BUDGET.firstOutputMs);
    expect(fallback.doStreamCalls).toHaveLength(0);
  });

  it("falls back when the repair also fails, and not when it succeeds", async () => {
    const failed = await run(mockModel(MISSING_CANDIDATES, MISSING_CANDIDATES), mockModel(VALID));
    expect(failed).toMatchObject({ fellBack: true, target: fallbackTarget });

    const fallback = mockModel(VALID);
    const repaired = await run(mockModel(MISSING_CANDIDATES, VALID), fallback);
    expect(repaired).toMatchObject({ fellBack: false, repaired: true });
    expect(fallback.doStreamCalls).toHaveLength(0);
  });
});

describe("runStructured: failure rules", () => {
  it("retries a quick 5xx once on the same model, within the jitter bound", async () => {
    const primary = failingThen(apiError(503));
    const fallback = mockModel(VALID);
    const result = await timed(run(primary, fallback, { retryJitterMs: 100 }));
    expect(result.ok && result.value.fellBack).toBe(false);
    expect(primary.doStreamCalls).toHaveLength(2);
    expect(fallback.doStreamCalls).toHaveLength(0);
    expect(result.ms).toBeLessThan(100 + 100);
  });

  it("waits at most 1 s before the retry by default", async () => {
    const result = await timed(run(failingThen(apiError(502)), mockModel(VALID)));
    expect(result.ok).toBe(true);
    expect(result.ms).toBeLessThan(1_000 + 150);
  });

  it("falls back after the retry also returns a 5xx", async () => {
    const primary = failingThen(apiError(503), apiError(503));
    const result = await run(primary, mockModel(VALID), { retryJitterMs: 10 });
    expect(result).toMatchObject({ fellBack: true, target: fallbackTarget });
    expect(primary.doStreamCalls).toHaveLength(2);
  });

  it("does not retry a daily quota error, falls back and opens the breaker", async () => {
    const breaker = new CircuitBreaker();
    const primary = failingThen(DAILY_QUOTA);
    const result = await run(primary, mockModel(VALID), { breaker });
    expect(result.fellBack).toBe(true);
    expect(primary.doStreamCalls).toHaveLength(1);
    expect(breaker.isOpen(entry.id)).toBe(true);
  });

  it("does not retry other 429s and leaves the breaker closed", async () => {
    const breaker = new CircuitBreaker();
    const primary = failingThen(apiError(429, "Rate limit exceeded: upstream"));
    const result = await run(primary, mockModel(VALID), { breaker });
    expect(result.fellBack).toBe(true);
    expect(primary.doStreamCalls).toHaveLength(1);
    expect(breaker.isOpen(entry.id)).toBe(false);
  });
});

describe("runStructured: circuit breaker", () => {
  it("opens after two timeouts, skips the primary during the cooldown, then tries it again", async () => {
    let now = 0;
    const breaker = new CircuitBreaker({ now: () => now });
    const primary = stalledOpenRouter("before-headers");
    const options = { breaker };

    await run(primary.model, mockModel(VALID), options);
    now += 60_000;
    await run(primary.model, mockModel(VALID), options);
    expect(primary.calls.count).toBe(2);

    // Open: the primary is skipped and the fallback answers at once.
    now += 60_000;
    const skipped = await timed(run(primary.model, mockModel(VALID), options));
    expect(primary.calls.count).toBe(2);
    expect(skipped.ok && skipped.value.fellBack).toBe(true);
    expect(skipped.ms).toBeLessThan(BUDGET.firstOutputMs);

    // After the 3-minute cooldown the primary is tried again and, on success, the breaker closes.
    now += 3 * 60_000;
    const recovered = await run(mockModel(VALID), mockModel(VALID), options);
    expect(recovered.fellBack).toBe(false);
    expect(breaker.isOpen(entry.id)).toBe(false);
  });

  it("counts one strike per call: a 5xx and its failed retry do not open the breaker alone", async () => {
    const breaker = new CircuitBreaker();
    await run(failingThen(apiError(503), apiError(503)), mockModel(VALID), { breaker, retryJitterMs: 10 });
    expect(breaker.isOpen(entry.id)).toBe(false);
    await run(failingThen(apiError(503), apiError(503)), mockModel(VALID), { breaker, retryJitterMs: 10 });
    expect(breaker.isOpen(entry.id)).toBe(true);
  });

  it("a 5xx recovered by the retry leaves the breaker closed", async () => {
    const breaker = new CircuitBreaker();
    await run(failingThen(apiError(503)), mockModel(VALID), { breaker, retryJitterMs: 10 });
    expect(breaker.isOpen(entry.id)).toBe(false);
  });

  it("does not count schema failures", async () => {
    const breaker = new CircuitBreaker();
    for (let i = 0; i < 3; i++) {
      await run(mockModel(MISSING_CANDIDATES, MISSING_CANDIDATES), mockModel(VALID), { breaker });
    }
    expect(breaker.isOpen(entry.id)).toBe(false);
  });
});

describe("ModelTimeoutError", () => {
  it("names its kind and limit", () => {
    expect(new ModelTimeoutError("first-output", 10_000).message).toBe("No output within 10000 ms");
  });
});
