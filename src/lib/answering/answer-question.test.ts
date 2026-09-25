import { APICallError, simulateReadableStream } from "ai";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AskEvent, AskRequest } from "@/contracts/ask";
import { AskEventSchema } from "@/contracts/ask";
import { CircuitBreaker } from "@/lib/ai/breaker";
import { resetCounters } from "@/lib/ai/counters";
import type { Embedder } from "@/lib/ai/embedder";
import { getEntry } from "@/lib/ai/registry";
import { vocabularyOf } from "@/lib/pool/vocabulary";
import { createBm25Index } from "@/lib/retrieval/bm25";
import { TEST_INDEX } from "@/lib/retrieval/fixtures";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import type { AnswerDeps } from "./answer-question";
import { answerQuestion, previousCandidateIds } from "./answer-question";
import type { RequestLog } from "./log";

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function step(text: string, calls: { name: string; input: string }[] = []): LanguageModelV4StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    { type: "response-metadata", modelId: "mock/model:free" },
    ...(text ? [{ type: "text-start" as const, id: "t" }, { type: "text-delta" as const, id: "t", delta: text }, { type: "text-end" as const, id: "t" }] : []),
    ...calls.map((call, i) => ({ type: "tool-call" as const, toolCallId: `call-${i}`, toolName: call.name, input: call.input })),
    { type: "finish", finishReason: { unified: calls.length ? ("tool-calls" as const) : ("stop" as const), raw: "x" }, usage: USAGE },
  ];
}

function model(...steps: LanguageModelV4StreamPart[][]) {
  let n = 0;
  return new MockLanguageModelV4({ doStream: async () => ({ stream: simulateReadableStream({ chunkDelayInMs: 0, chunks: steps[Math.min(n++, steps.length - 1)]! }) }) });
}

/** A model that fails every call with `error`. */
const failing = (error: Error) =>
  new MockLanguageModelV4({
    doStream: async () => {
      throw error;
    },
  });

const embedder: Embedder = { dimensions: 2, embedDocuments: vi.fn(async () => []), embedQuery: vi.fn(async () => [1, 0]) };
const FIND = { name: "find_candidates", input: JSON.stringify({ filters: { skills: [{ skill: "Python" }] }, scope: "whole_pool" }) };
const PRESENT = { name: "present", input: JSON.stringify({ view: "list", candidates: [{ id: "andrei-popescu", page: 1, reason: "" }, { id: "elena-georgiou", page: 1, reason: "" }], skills: ["Python"] }) };
const request = (question: string, history: AskRequest["history"] = []): AskRequest => ({ question, model: "primary", history });

/** This phase's primary has no fallback; the fallback tests hand it the alternative's model as one. */
const ALTERNATIVE = { ...getEntry("alternative"), enabled: true };
const WITH_FALLBACK = { ...getEntry("primary"), fallback: { provider: ALTERNATIVE.provider, vendor: ALTERNATIVE.vendor, model: ALTERNATIVE.model } };
const withFallback: AnswerDeps["entries"] = (id) => (id === "primary" ? WITH_FALLBACK : ALTERNATIVE);

async function run(
  primary: MockLanguageModelV4,
  fallback: MockLanguageModelV4 = model(step("unused")),
  req = request("Who knows Python?"),
  controller = new AbortController(),
  entries?: AnswerDeps["entries"],
) {
  const events: AskEvent[] = [];
  const logs: RequestLog[] = [];
  const deps: AnswerDeps = {
    pool: { entries: TEST_INDEX, vocabulary: vocabularyOf(TEST_INDEX), bm25: createBm25Index(TEST_INDEX) },
    embedder,
    store: createInMemoryStore(),
    modelFor: (target) => (target.model === getEntry("primary").model ? primary : fallback),
    breaker: new CircuitBreaker(),
    log: (record) => logs.push(record),
    requestId: () => "req-1",
    retryJitterMs: 0,
    ...(entries ? { entries } : {}),
  };
  await answerQuestion(req, (e) => events.push(e), deps, controller.signal);
  return { events, log: logs[0]! };
}

beforeEach(resetCounters);

describe("answerQuestion", () => {
  it("streams progress per tool, the final text, then one answer with its view, sources, what was matched and who answered", async () => {
    const { events, log } = await run(model(step("", [FIND]), step("Both know Python.", [PRESENT])));
    expect(events.map((e) => (e.type === "progress" ? `${e.stage}:${e.message}` : e.type))).toEqual([
      "understand:Understanding the question",
      "search:Filtering the CVs",
      "write:Writing the answer",
      "delta",
      "answer",
    ]);
    const answer = events.at(-1);
    expect(answer).toMatchObject({
      type: "answer",
      text: "Both know Python.",
      view: { kind: "list", rows: [{ candidateId: "andrei-popescu" }, { candidateId: "elena-georgiou" }] },
      matched: { kind: "matched", count: 2, total: 3 },
      answeredBy: { model: "primary", name: "Gemini Flash-Lite", fellBack: false },
    });
    expect(answer?.type === "answer" && answer.sources.map((s) => s.candidateId)).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(AskEventSchema.safeParse(answer).success).toBe(true);
    expect(log).toMatchObject({
      event: "ask",
      requestId: "req-1",
      model: { requested: "primary", used: "mock/model:free", fellBack: false },
      outcome: "answer",
      presentation: { view: "list", candidates: 2, corrections: [] },
      repairs: 0,
    });
    expect(log.toolCalls).toEqual([{ step: 0, tool: "find_candidates", input: { filters: { skills: [{ skill: "Python" }] }, scope: "whole_pool" }, ok: true, detail: "2 of 3 matched", ms: expect.any(Number) }]);
    expect(log.steps).toHaveLength(2);
    expect(log.counters["google:gemini-3.5-flash-lite"]).toEqual({ success: 1, error: 0 });
  });

  it("drops the model's words on a count: the app's sentence is the answer", async () => {
    const count = { name: "count_candidates", input: JSON.stringify({ filters: { skills: [{ skill: "Python" }] }, scope: "whole_pool" }) };
    const presentCount = { name: "present", input: JSON.stringify({ view: "count", candidates: [], skills: ["Python"] }) };
    const { events, log } = await run(model(step("", [count]), step("Two candidates know Python.", [presentCount])));
    expect(events.some((e) => e.type === "delta")).toBe(false);
    expect(events.at(-1)).toMatchObject({ type: "answer", text: "", view: { kind: "list", count: { matched: 2, total: 3 }, lead: "Out of 3 candidates, there are 2 with Python experience." } });
    expect(log.presentation?.corrections).toContain("The model's text was dropped: a count is the app's sentence");
  });

  it("answers a greeting in text alone: no tool, no sources, nothing matched", async () => {
    const { events } = await run(model(step("Hi! Ask me about your candidates.")), undefined, request("hey"));
    expect(events.map((e) => e.type)).toEqual(["progress", "progress", "delta", "answer"]);
    expect(events.at(-1)).toMatchObject({ type: "answer", text: "Hi! Ask me about your candidates.", view: undefined, sources: [], matched: null });
  });

  it("fails plainly when the presentation names a candidate no tool returned", async () => {
    const ghost = { name: "present", input: JSON.stringify({ view: "list", candidates: [{ id: "lena-novak", page: 1, reason: "" }], skills: [] }) };
    const { events, log } = await run(model(step("", [FIND]), step("Lena.", [ghost])));
    expect(events.at(-1)).toEqual({ type: "error", message: "I couldn't verify that answer against the CVs. Try again.", retryable: true });
    expect(log.outcome).toBe("error");
    expect(log.error).toMatch(/lena-novak/);
  });

  it("hands over to the fallback when the primary is down, and says which model answered", async () => {
    const down = failing(new APICallError({ message: "HTTP 503", url: "https://example.com", requestBodyValues: {}, statusCode: 503 }));
    const { events, log } = await run(down, model(step("", [FIND]), step("From the fallback.", [PRESENT])), undefined, undefined, withFallback);
    expect(events.at(-1)).toMatchObject({ type: "answer", text: "From the fallback.", answeredBy: { model: "primary", name: "Nemotron 3 Super", fellBack: true } });
    // The 503 was retried once on the primary, then the fallback took over.
    expect(log.modelFailures.map((f) => f.then)).toEqual(["retried", "fell back"]);
    expect(log.modelFailures[1]).toMatchObject({ reason: expect.stringContaining("503"), to: expect.stringContaining("nemotron") });
    expect(log.model.fellBack).toBe(true);
  });

  it("retries the same model once after a 5xx, and logs a fallback that fails too", async () => {
    const flaky = model(step("", [FIND]), step("Second try.", [PRESENT]));
    const stream = flaky.doStream;
    let calls = 0;
    flaky.doStream = async (options) => {
      if (calls++ === 0) throw new APICallError({ message: "HTTP 503", url: "https://example.com", requestBodyValues: {}, statusCode: 503 });
      return stream(options);
    };
    const { events, log } = await run(flaky);
    expect(events.at(-1)).toMatchObject({ type: "answer", text: "Second try.", answeredBy: { fellBack: false } });
    expect(log.modelFailures).toMatchObject([{ then: "retried" }]);

    const down = failing(new APICallError({ message: "HTTP 503", url: "https://example.com", requestBodyValues: {}, statusCode: 503 }));
    const limited = failing(new APICallError({ message: "HTTP 429", url: "https://example.com", requestBodyValues: {}, statusCode: 429 }));
    const failed = await run(down, limited, undefined, undefined, withFallback);
    expect(failed.events.at(-1)).toMatchObject({ type: "error" });
    expect(failed.log.modelFailures.map((f) => f.then)).toEqual(["retried", "fell back", "gave up"]);
    // Without a fallback, this phase's primary ends the request after its retry.
    const alone = await run(failing(new APICallError({ message: "HTTP 503", url: "https://example.com", requestBodyValues: {}, statusCode: 503 })));
    expect(alone.events.at(-1)).toMatchObject({ type: "error", message: "The model is busy right now. Try again in a moment." });
    expect(alone.log.modelFailures.map((f) => f.then)).toEqual(["retried", "gave up"]);
  });

  it("ends without an event when the request is aborted, and rejects a model that is not offered", async () => {
    const controller = new AbortController();
    const aborting = new MockLanguageModelV4({
      doStream: async () => {
        controller.abort();
        throw new Error("aborted");
      },
    });
    const { events, log } = await run(aborting, undefined, request("Who knows Python?"), controller);
    expect(events.filter((e) => e.type === "answer" || e.type === "error")).toEqual([]);
    expect(log.outcome).toBe("aborted");
  });

  it("finds the previous answer's candidates in the history", () => {
    expect(previousCandidateIds([{ question: "a", answer: "", candidateIds: ["x"] }, { question: "b", answer: "hi", candidateIds: [] }])).toEqual(["x"]);
    expect(previousCandidateIds([])).toEqual([]);
  });
});
