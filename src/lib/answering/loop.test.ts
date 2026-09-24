import { simulateReadableStream } from "ai";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/lib/ai/embedder";
import { vocabularyOf } from "@/lib/pool/vocabulary";
import { createBm25Index } from "@/lib/retrieval/bm25";
import { TEST_INDEX } from "@/lib/retrieval/fixtures";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import type { LoopRequest } from "./loop";
import { EmptyAnswerError, runLoop, StepLimitError } from "./loop";
import { buildInstructions } from "./prompt";
import type { ToolResult } from "./tools";
import { createTools } from "./tools";

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

/** One streamed step: optional text, then tool calls, then the finish. */
function step(text: string, calls: { name: string; input: string }[] = []): LanguageModelV4StreamPart[] {
  return [
    { type: "stream-start", warnings: [] },
    { type: "response-metadata", modelId: "mock/model:free" },
    ...(text ? [{ type: "text-start" as const, id: "t" }, { type: "text-delta" as const, id: "t", delta: text }, { type: "text-end" as const, id: "t" }] : []),
    ...calls.map((call, i) => ({ type: "tool-call" as const, toolCallId: `call-${i}`, toolName: call.name, input: call.input })),
    { type: "finish", finishReason: { unified: calls.length ? ("tool-calls" as const) : ("stop" as const), raw: "x" }, usage: USAGE },
  ];
}

/** A model that streams the given steps in turn. */
function model(...steps: LanguageModelV4StreamPart[][]) {
  let n = 0;
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: simulateReadableStream({ chunkDelayInMs: 0, chunks: steps[Math.min(n++, steps.length - 1)]! }) }),
  });
}

const embedder: Embedder = { dimensions: 2, embedDocuments: vi.fn(async () => []), embedQuery: vi.fn(async () => [1, 0]) };

function request(overrides: Partial<LoopRequest> = {}) {
  const results: ToolResult[] = [];
  const events: string[] = [];
  const tools = createTools({ entries: TEST_INDEX, vocabulary: vocabularyOf(TEST_INDEX), embedder, store: createInMemoryStore(), bm25: createBm25Index(TEST_INDEX), previousIds: [] }, (r) => results.push(r));
  const req: LoopRequest = {
    instructions: buildInstructions(TEST_INDEX, []),
    messages: [{ role: "user", content: "Who knows Python?" }],
    tools,
    signal: new AbortController().signal,
    onTool: (name) => events.push(`tool:${name}`),
    onStep: (s) => events.push(`step:${s.step}:${s.finishReason}`),
    onToolCall: (c) => events.push(`call:${c.tool}:${c.ok ? "ok" : "error"}`),
    onRepair: () => events.push("repair"),
    ...overrides,
  };
  return { req, results, events };
}

const FIND = { name: "find_candidates", input: JSON.stringify({ filters: { skills: [{ skill: "Python" }] }, scope: "whole_pool" }) };
const PRESENT = { name: "present", input: JSON.stringify({ view: "list", candidates: [{ id: "andrei-popescu", page: 1, reason: "" }, { id: "elena-georgiou", page: 1, reason: "" }], skills: ["Python"] }) };

describe("runLoop", () => {
  it("runs the tool step, then takes the text and the presentation of the final step", async () => {
    const { req, results, events } = request();
    const result = await runLoop(model(step("", [FIND]), step("Both know Python.", [PRESENT])), req);
    expect(result).toMatchObject({ text: "Both know Python.", present: { view: "list" }, modelId: "mock/model:free", steps: 2 });
    expect(results.map((r) => r.tool)).toEqual(["find_candidates"]);
    expect(events).toEqual(["tool:find_candidates", "call:find_candidates:ok", "step:0:tool-calls", "step:1:tool-calls"]);
  });

  it("drops the text of a tool step: only the final step's text is the answer", async () => {
    const { req } = request();
    const result = await runLoop(model(step("Let me check.", [FIND]), step("Two do.", [PRESENT])), req);
    expect(result.text).toBe("Two do.");
  });

  it("answers in text alone when the model calls no tool", async () => {
    const { req, results } = request();
    const result = await runLoop(model(step("Hi! Ask me about your candidates.")), req);
    expect(result).toMatchObject({ text: "Hi! Ask me about your candidates.", steps: 1 });
    expect(result.present).toBeUndefined();
    expect(results).toEqual([]);
  });

  it("stops at the step limit with a clear error, and reports an empty answer", async () => {
    const { req } = request();
    await expect(runLoop(model(step("", [FIND]), step("", [FIND]), step("", [FIND]), step("never")), req)).rejects.toBeInstanceOf(StepLimitError);
    await expect(runLoop(model(step("")), request().req)).rejects.toBeInstanceOf(EmptyAnswerError);
  });

  it("sends an invalid input back to the model after one repair attempt, and goes on", async () => {
    const bad = { name: "find_candidates", input: JSON.stringify({ filters: { skills: [{ skill: "Rust" }] }, scope: "whole_pool" }) };
    const { req, events, results } = request();
    const m = model(step("", [bad]), step("", [FIND]), step("Two do.", [PRESENT]));
    // The repair re-asks the same model with generateText; it answers with the same bad call, so the error goes back as a tool result.
    m.doGenerate = async () => ({
      content: [{ type: "tool-call", toolCallId: "r", toolName: "find_candidates", input: bad.input }],
      finishReason: { unified: "tool-calls", raw: "x" },
      usage: USAGE,
      warnings: [],
    });
    const result = await runLoop(m, req);
    expect(result.text).toBe("Two do.");
    expect(events).toContain("repair");
    expect(events.filter((e) => e === "call:find_candidates:error")).toHaveLength(1);
    expect(results.map((r) => r.tool)).toEqual(["find_candidates"]);
  });

  it("gives a tool's own error back to the model", async () => {
    const scoped = { name: "find_candidates", input: JSON.stringify({ filters: {}, scope: "previous_answer" }) };
    const { req, events } = request();
    const result = await runLoop(model(step("", [scoped]), step("", [FIND]), step("Both.", [PRESENT])), req);
    expect(result.text).toBe("Both.");
    expect(events.filter((e) => e.startsWith("call:find_candidates"))).toEqual(["call:find_candidates:error", "call:find_candidates:ok"]);
  });
});
