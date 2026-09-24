import { APICallError, simulateReadableStream, tool } from "ai";
import type { ToolSet } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CircuitBreaker } from "./breaker";
import type { ModelEntry, ModelTarget } from "./registry";
import { getEntry } from "./registry";
import { modelKey } from "./route";
import { EmptyAnswerError, streamAnswerText, StreamInterruptedError } from "./stream-text";

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** A model that streams `pieces` as text deltas, after `delayMs`; an Error piece fails the stream there. */
function model(pieces: (string | Error)[], delayMs = 0) {
  const chunks = pieces.map((piece) =>
    piece instanceof Error ? { type: "error" as const, error: piece } : { type: "text-delta" as const, id: "t", delta: piece },
  );
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: delayMs,
        chunkDelayInMs: 0,
        chunks: [
          { type: "stream-start" as const, warnings: [] },
          { type: "text-start" as const, id: "t" },
          ...chunks,
          { type: "text-end" as const, id: "t" },
          { type: "finish" as const, finishReason: { unified: "stop" as const, raw: "stop" }, usage: USAGE },
        ],
      }),
    }),
  });
}

/** A model that throws `error` on its first `failures` calls, then streams `answer`. */
function failingThen(failures: number, error: Error, answer = "Lena Novak.") {
  let calls = 0;
  return new MockLanguageModelV4({
    doStream: async (options) => {
      calls += 1;
      if (calls <= failures) throw error;
      return model([answer]).doStream(options);
    },
  });
}

const apiError = (statusCode: number, message: string) =>
  new APICallError({ message, url: "https://example.com", requestBodyValues: {}, statusCode });
// Both seen live on 2026-09-24.
const HIGH_DEMAND = apiError(503, "This model is currently experiencing high demand. Spikes in demand are usually temporary.");
const DAILY_QUOTA = apiError(429, "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day");

const fallbackTarget: ModelTarget = { provider: "google", vendor: "google", model: "fallback-model" };
const entry: ModelEntry = { ...getEntry("primary"), fallback: fallbackTarget };
const request = { instructions: "Answer.", messages: [{ role: "user" as const, content: "Who has React?" }] };
const FIRST_OUTPUT_MS = 150;

function run(
  primary: MockLanguageModelV4,
  fallback: MockLanguageModelV4,
  { breaker = new CircuitBreaker(), totalMs = 2_000, tools }: { breaker?: CircuitBreaker; totalMs?: number; tools?: ToolSet } = {},
) {
  const deltas: string[] = [];
  const result = streamAnswerText(entry, { ...request, tools }, {
    onDelta: (text) => deltas.push(text),
    budget: { firstOutputMs: FIRST_OUTPUT_MS, totalMs },
    retryJitterMs: 10,
    breaker,
    modelFor: (target) => (target.model === entry.model ? primary : fallback),
  });
  return { result, deltas };
}

const SHOW = { show: tool({ description: "Show a candidate.", inputSchema: z.object({ id: z.string() }) }) };

/** A model that streams `text` (if any), then calls `show` with each raw JSON input in turn. */
function calling(text: string, ...inputs: string[]) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 0,
        chunks: [
          { type: "stream-start" as const, warnings: [] },
          ...(text
            ? [
                { type: "text-start" as const, id: "t" },
                { type: "text-delta" as const, id: "t", delta: text },
                { type: "text-end" as const, id: "t" },
              ]
            : []),
          ...inputs.map((input, i) => ({ type: "tool-call" as const, toolCallId: `call-${i}`, toolName: "show", input })),
          { type: "finish" as const, finishReason: { unified: "tool-calls" as const, raw: "tool_calls" }, usage: USAGE },
        ],
      }),
    }),
  });
}

describe("streamAnswerText with tools", () => {
  it("returns the text and the first valid tool call", async () => {
    const { result, deltas } = run(calling("Two candidates.", '{"id":"lena-novak"}', '{"id":"andrei-popescu"}'), model(["unused"]), { tools: SHOW });
    await expect(result).resolves.toMatchObject({ text: "Two candidates.", toolCall: { toolName: "show", input: { id: "lena-novak" } } });
    expect(deltas).toEqual(["Two candidates."]);
  });

  it("accepts an answer that is only a tool call", async () => {
    const { result } = run(calling("", '{"id":"lena-novak"}'), model(["unused"]), { tools: SHOW });
    await expect(result).resolves.toMatchObject({ text: "", toolCall: { input: { id: "lena-novak" } }, fellBack: false });
  });

  it("drops a call whose input fails the tool's schema", async () => {
    const { result } = run(calling("Lena Novak.", '{"id":5}'), model(["unused"]), { tools: SHOW });
    const answer = await result;
    expect(answer.text).toBe("Lena Novak.");
    expect(answer.toolCall).toBeUndefined();
    // With neither text nor a valid call, the answer is empty and the fallback answers.
    await expect(run(calling("", '{"id":5}'), model(["From the fallback."]), { tools: SHOW }).result).resolves.toMatchObject({ fellBack: true });
  });
});

describe("streamAnswerText", () => {
  it("streams the primary's text piece by piece", async () => {
    const { result, deltas } = run(model(["Lena ", "Novak."]), model(["unused"]));
    await expect(result).resolves.toMatchObject({ text: "Lena Novak.", fellBack: false });
    expect(deltas).toEqual(["Lena ", "Novak."]);
  });

  it("hands a silent model over to the fallback without trying it again", async () => {
    const primary = model(["late"], 500);
    const { result, deltas } = run(primary, model(["From the fallback."]));
    await expect(result).resolves.toMatchObject({ text: "From the fallback.", fellBack: true });
    expect(deltas).toEqual(["From the fallback."]);
    expect(primary.doStreamCalls).toHaveLength(1);
  });

  it("waits for the last model past the first-output limit", async () => {
    // Gemini's free tier under load held a request 21 s, then answered at once.
    const { result } = run(model(["late"], 500), model(["30 CVs."], FIRST_OUTPUT_MS * 3));
    await expect(result).resolves.toMatchObject({ text: "30 CVs.", fellBack: true });
  });

  it("gives the last model no more than the total budget", async () => {
    const { result } = run(model(["late"], 1_000), model(["late"], 1_000), { totalMs: 400 });
    await expect(result).rejects.toMatchObject({ name: "ModelTimeoutError", kind: "total" });
  });

  it("retries a busy model once before its first word, without switching", async () => {
    const primary = failingThen(1, HIGH_DEMAND);
    const fallback = model(["unused"]);
    await expect(run(primary, fallback).result).resolves.toMatchObject({ text: "Lena Novak.", fellBack: false });
    expect(fallback.doStreamCalls).toHaveLength(0);
  });

  it("falls back when the retry is busy too", async () => {
    const { result } = run(failingThen(2, HIGH_DEMAND), model(["From the fallback."]));
    await expect(result).resolves.toMatchObject({ text: "From the fallback.", fellBack: true });
  });

  it("falls back on an empty answer, and reports it when the fallback is empty too", async () => {
    await expect(run(model([]), model(["Fallback."])).result).resolves.toMatchObject({ fellBack: true });
    await expect(run(model([]), model([])).result).rejects.toBeInstanceOf(EmptyAnswerError);
  });

  it("never switches models once text has reached the recruiter", async () => {
    const fallback = model(["unused"]);
    const { result, deltas } = run(model(["Lena ", HIGH_DEMAND]), fallback);
    await expect(result).rejects.toBeInstanceOf(StreamInterruptedError);
    expect(deltas).toEqual(["Lena "]);
    expect(fallback.doStreamCalls).toHaveLength(0);
  });

  it("passes over a fallback out of its daily quota, and then waits for the primary", async () => {
    // The sequence seen live: the primary silent, then the fallback out of free requests for the day.
    const breaker = new CircuitBreaker();
    const primary = model(["Lena Novak."], FIRST_OUTPUT_MS * 3);
    const fallback = model([DAILY_QUOTA]);

    // The recruiter hears about the primary, which they chose, not about the fallback's quota.
    await expect(run(primary, fallback, { breaker }).result).rejects.toMatchObject({ name: "ModelTimeoutError", kind: "first-output" });
    expect(breaker.isOpen(modelKey(fallbackTarget))).toBe(true);

    // With the fallback passed over, the primary is the last model and is waited for.
    await expect(run(primary, fallback, { breaker }).result).resolves.toMatchObject({ text: "Lena Novak.", fellBack: false });
    expect(fallback.doStreamCalls).toHaveLength(1);
  });

  it("skips the primary while its breaker is open, and waits for the fallback alone", async () => {
    const breaker = new CircuitBreaker();
    breaker.trip(modelKey(entry));
    const primary = model(["unused"]);
    const { result } = run(primary, model(["From the fallback."], FIRST_OUTPUT_MS * 3), { breaker });
    await expect(result).resolves.toMatchObject({ text: "From the fallback.", fellBack: true });
    expect(primary.doStreamCalls).toHaveLength(0);
  });
});
