import { describe, expect, it, vi } from "vitest";
import type { AskEvent, AskRequest } from "@/contracts/ask";
import type { RequestLog } from "@/lib/answering/log";
import { sourcesOf } from "@/mocks/answers";
import { TEST_SEEDS } from "./fixtures";
import { historyFor, REQUESTS_PER_QUESTION, reportOf, runEvaluation } from "./run";
import type { Asked } from "./run";
import type { SectionPages } from "./score";
import type { GoldenQuestion } from "./types";

const questions: GoldenQuestion[] = [
  { id: "a", kind: "exact", question: "Who knows Python?", expect: { view: "list", candidates: () => ["andrei-popescu", "elena-georgiou"], section: "skills" } },
  { id: "b", kind: "exact", question: "Of those, who speaks Romanian?", after: "a", expect: { view: "list", candidates: () => ["andrei-popescu"] } },
  { id: "c", kind: "text", question: "hey", expect: { view: "text" } },
];

const log = (candidatesReturned: string[]): RequestLog => ({
  event: "ask",
  requestId: "r",
  question: "q",
  model: { requested: "primary", used: "m", fellBack: false },
  steps: [],
  toolCalls: [],
  repairs: 0,
  fallbacks: [],
  candidatesReturned,
  outcome: "answer",
  latencyMs: 1,
  counters: {},
});

const answeredBy = { model: "primary" as const, name: "Nemotron 3 Super", fellBack: false };
const listOf = (ids: string[]): AskEvent => {
  const view = { kind: "list" as const, ranked: false, skills: [], rows: ids.map((id) => ({ candidateId: id, name: id, headline: "x", skills: [], reason: "", page: 1 })) };
  return { type: "answer", text: "Here.", view, sources: sourcesOf(view), matched: { kind: "matched", count: ids.length, total: 3 }, answeredBy };
};

const pages: SectionPages = () => ({ skills: [1] });

describe("runEvaluation", () => {
  it("asks every question per model, passes a follow-up its prior answer, scores and reports", async () => {
    const seen: AskRequest[] = [];
    const ask = vi.fn(async (request: AskRequest): Promise<Asked> => {
      seen.push(request);
      const events: AskEvent[] =
        request.question === "Who knows Python?"
          ? [listOf(["andrei-popescu", "elena-georgiou"])]
          : request.question === "hey"
            ? [{ type: "answer", text: "Hi!", sources: [], matched: null, answeredBy }]
            : [listOf(["andrei-popescu"])];
      return { events, log: log(["andrei-popescu", "elena-georgiou"]), latencyMs: 100 };
    });
    const runs = await runEvaluation({ questions, models: ["primary"], repeat: 1, seeds: TEST_SEEDS, sectionPages: pages, ask });
    expect(seen.map((r) => r.history.length)).toEqual([0, 1, 0]);
    expect(seen[1]?.history[0]).toMatchObject({ question: "Who knows Python?", candidateIds: ["andrei-popescu", "elena-georgiou"] });
    expect(runs[0]?.questions.map((q) => q.score.problems)).toEqual([[], [], []]);
    const report = reportOf(runs[0]!);
    expect(report.summary.passes).toBe(true);
    expect(report.displayName).toBe("Nemotron 3 Super");
  });

  it("repeats, runs several models, and reports a failing question", async () => {
    const ask = vi.fn(async (): Promise<Asked> => ({ events: [listOf(["elena-georgiou"])], log: log(["elena-georgiou"]), latencyMs: 50 }));
    const runs = await runEvaluation({ questions: questions.slice(0, 1), models: ["primary", "alternative"], repeat: 2, seeds: TEST_SEEDS, sectionPages: pages, ask });
    expect(ask).toHaveBeenCalledTimes(4);
    expect(runs.map((run) => run.model)).toEqual(["primary", "alternative"]);
    expect(reportOf(runs[0]!).summary.exactF1).toBeCloseTo(2 / 3);
    expect(reportOf(runs[0]!).summary.passes).toBe(false);
  });

  it("gives a follow-up no history when its prior question failed, and states the requests per question", () => {
    expect(historyFor(questions[1]!, new Map([["a", { events: [{ type: "error", message: "x", retryable: true }], latencyMs: 1 }]]), questions)).toEqual([]);
    expect(REQUESTS_PER_QUESTION).toBe(2.5);
  });
});
