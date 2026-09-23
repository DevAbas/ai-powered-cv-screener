import { describe, expect, it } from "vitest";
import { AskRequestSchema } from "@/contracts/ask";
import { ANSWERS } from "@/mocks/answers";
import { candidateIdsOf, HISTORY_LIMIT, historyFrom } from "./history";
import type { ExchangeState } from "./state";

const exchange = (id: string, patch: Partial<ExchangeState>): ExchangeState => ({
  id,
  question: `Question ${id}`,
  status: "answered",
  steps: [],
  slow: false,
  ...patch,
});

describe("candidateIdsOf", () => {
  it("collects ids from every payload", () => {
    expect(candidateIdsOf(ANSWERS.rank)).toEqual(["jane-doe", "aiko-tanaka", "lena-novak"]);
    expect(candidateIdsOf(ANSWERS.compare)).toEqual(["ali-hasanov", "nigar-mammadova"]);
    expect(candidateIdsOf(ANSWERS.fact)).toEqual(["lena-novak"]);
    expect(candidateIdsOf(ANSWERS.profile)).toEqual(["jane-doe"]);
    expect(candidateIdsOf(ANSWERS.empty)).toEqual([]);
  });
});

describe("historyFrom", () => {
  it("keeps answered exchanges only", () => {
    const history = historyFrom([
      exchange("a", { answer: ANSWERS.filter }),
      exchange("b", { status: "error", error: { message: "x", retryable: true } }),
      exchange("c", { status: "stopped" }),
      exchange("d", { status: "running" }),
    ]);
    expect(history).toEqual([
      {
        question: "Question a",
        kind: "filter",
        summary: ANSWERS.filter.summary,
        candidateIds: ["lena-novak", "jane-doe", "sofia-almeida", "leon-fischer"],
      },
    ]);
  });

  it("keeps the most recent exchanges within the limit", () => {
    const exchanges = Array.from({ length: HISTORY_LIMIT + 3 }, (_, i) => exchange(String(i), { answer: ANSWERS.empty }));
    const history = historyFrom(exchanges);
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].question).toBe("Question 3");
  });
});

describe("HISTORY_LIMIT", () => {
  it("matches the request contract", () => {
    const history = historyFrom(Array.from({ length: HISTORY_LIMIT }, (_, i) => exchange(String(i), { answer: ANSWERS.empty })));
    const request = (h: typeof history) => ({ question: "Next?", model: "primary", history: h });
    expect(AskRequestSchema.safeParse(request(history)).success).toBe(true);
    expect(AskRequestSchema.safeParse(request([...history, history[0]])).success).toBe(false);
  });
});
