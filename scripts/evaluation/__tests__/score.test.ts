import { describe, expect, it } from "vitest";
import { TEST_SEEDS } from "../fixtures";
import { percentile, scoreQuestion, setMetrics, summarize, THRESHOLDS } from "../score";
import type { ObservedAnswer, QuestionScore, SectionPages } from "../score";
import type { GoldenQuestion } from "../types";

const pages: SectionPages = () => ({ header: [1], skills: [1], languages: [2], experience: [1] });

const answer = (overrides: Partial<ObservedAnswer> = {}): ObservedAnswer => ({
  outcome: "answer",
  text: "Two of them.",
  view: "list",
  presented: ["andrei-popescu", "lena-novak"],
  reasons: [],
  sources: [
    { candidateId: "andrei-popescu", page: 1 },
    { candidateId: "lena-novak", page: 1 },
  ],
  toolCandidateIds: ["andrei-popescu", "lena-novak"],
  latencyMs: 1200,
  ...overrides,
});

const seniors: GoldenQuestion = {
  id: "t1",
  kind: "exact",
  question: "Who is senior?",
  expect: { view: "list", candidates: () => ["andrei-popescu", "lena-novak"], section: "skills" },
};

describe("setMetrics", () => {
  it("scores precision, recall and F1, and agrees on two empty sets", () => {
    expect(setMetrics(["a", "b"], ["a", "c"])).toEqual({ precision: 0.5, recall: 0.5, f1: 0.5 });
    expect(setMetrics([], [])).toEqual({ precision: 1, recall: 1, f1: 1 });
    expect(setMetrics(["a"], []).f1).toBe(0);
  });
});

describe("scoreQuestion", () => {
  it("passes a correct, cited list", () => {
    const score = scoreQuestion(seniors, answer(), TEST_SEEDS, pages);
    expect(score).toMatchObject({ retrieval: { f1: 1 }, composition: true, candidateCitations: true, pageCitations: 1, invented: 0, problems: [] });
  });

  it("counts an invented candidate and a missing source without touching composition", () => {
    const score = scoreQuestion(
      seniors,
      answer({ presented: ["andrei-popescu", "lena-novak", "ghost"], sources: [{ candidateId: "andrei-popescu", page: 1 }] }),
      TEST_SEEDS,
      pages,
    );
    expect(score.invented).toBe(1);
    expect(score.candidateCitations).toBe(false);
    expect(score.composition).toBe(true);
    expect(score.retrieval?.precision).toBeCloseTo(2 / 3);
  });

  it("scores a wrong section page", () => {
    const score = scoreQuestion(seniors, answer({ sources: [{ candidateId: "andrei-popescu", page: 2 }, { candidateId: "lena-novak", page: 1 }] }), TEST_SEEDS, pages);
    expect(score.pageCitations).toBe(0.5);
    expect(score.composition).toBe(true);
  });

  it("fails composition on the wrong view, a wrong count, a missing reason or a missing next question", () => {
    const count: GoldenQuestion = { id: "t2", kind: "exact", question: "How many?", expect: { view: "count", count: () => 2, candidates: () => ["andrei-popescu", "lena-novak"] } };
    expect(scoreQuestion(count, answer({ view: "count", count: 3, presented: [], sources: [] }), TEST_SEEDS, pages).composition).toBe(false);
    expect(scoreQuestion(count, answer({ view: "count", count: 2, presented: [], sources: [] }), TEST_SEEDS, pages)).toMatchObject({ composition: true, retrieval: undefined });

    const ranked: GoldenQuestion = { id: "t3", kind: "exact", question: "Top 2", expect: { view: "ranked", rows: 2, eligible: () => ["andrei-popescu", "lena-novak", "elena-georgiou"], first: () => "lena-novak" } };
    expect(scoreQuestion(ranked, answer({ view: "ranked", reasons: ["", "x"] }), TEST_SEEDS, pages).problems).toContain("a ranked row has no reason");
    expect(scoreQuestion(ranked, answer({ view: "ranked", presented: ["lena-novak", "andrei-popescu"], reasons: ["a", "b"] }), TEST_SEEDS, pages).composition).toBe(true);

    const empty: GoldenQuestion = { id: "t4", kind: "text", question: "Rust?", expect: { view: "no_match", nextQuestion: true } };
    expect(scoreQuestion(empty, answer({ view: "no_match", presented: [], sources: [], text: "Nobody lists Rust." }), TEST_SEEDS, pages).problems).toEqual(["no next question"]);
    const state = scoreQuestion(empty, answer({ view: "no_match", presented: [], text: "Nobody lists Rust. Try Go?" }), TEST_SEEDS, pages);
    expect(state.noSourceState).toBe(false);
    expect(state.composition).toBe(false);
  });

  it("accepts a text-only answer and rejects one with candidates", () => {
    const greeting: GoldenQuestion = { id: "t5", kind: "text", question: "hey", expect: { view: "text" } };
    expect(scoreQuestion(greeting, answer({ view: undefined, presented: [], sources: [], text: "Hi!" }), TEST_SEEDS, pages).composition).toBe(true);
    expect(scoreQuestion(greeting, answer({ view: undefined, sources: [] }), TEST_SEEDS, pages).composition).toBe(false);
  });

  it("checks free-text bounds and fact text", () => {
    const free: GoldenQuestion = { id: "t6", kind: "free", question: "ML?", expect: { view: "list", atLeast: () => ["lena-novak"], atMost: () => ["lena-novak", "andrei-popescu"] } };
    expect(scoreQuestion(free, answer(), TEST_SEEDS, pages).withinBounds).toBe(true);
    expect(scoreQuestion(free, answer({ presented: ["elena-georgiou"], sources: [{ candidateId: "elena-georgiou", page: 1 }], toolCandidateIds: ["elena-georgiou"] }), TEST_SEEDS, pages).withinBounds).toBe(false);

    const fact: GoldenQuestion = { id: "t7", kind: "exact", question: "Where?", expect: { view: "list", candidates: () => ["lena-novak"], textIncludes: () => ["Kinetix Digital"] } };
    expect(scoreQuestion(fact, answer({ presented: ["lena-novak"], text: "At Kinetix Digital." }), TEST_SEEDS, pages).composition).toBe(true);
    expect(scoreQuestion(fact, answer({ presented: ["lena-novak"], text: "Somewhere." }), TEST_SEEDS, pages).problems).toContain('text lacks "Kinetix Digital"');
  });

  it("turns an error into a failed question", () => {
    const score = scoreQuestion(seniors, answer({ outcome: "error", error: "timeout" }), TEST_SEEDS, pages);
    expect(score).toMatchObject({ composition: false, retrieval: { f1: 0 }, problems: ["error: timeout"] });
  });
});

describe("summarize", () => {
  const perfect: QuestionScore = { id: "a", kind: "exact", retrieval: { precision: 1, recall: 1, f1: 1 }, composition: true, candidateCitations: true, pageCitations: 1, invented: 0, latencyMs: 1000, problems: [] };

  it("passes when every threshold is met", () => {
    const summary = summarize([perfect, { ...perfect, id: "b", latencyMs: 3000 }]);
    expect(summary).toMatchObject({ passes: true, failures: [], exactF1: 1, latency: { p50: 1000, p95: 3000 } });
  });

  it("names every threshold missed", () => {
    const summary = summarize([perfect, { ...perfect, id: "b", retrieval: { precision: 0, recall: 0, f1: 0 }, composition: false, invented: 1, candidateCitations: false, problems: ["x"] }]);
    expect(summary.passes).toBe(false);
    expect(summary.failures.join("\n")).toMatch(/invented candidates 1/);
    expect(summary.failures.join("\n")).toMatch(/exact-question F1 50%/);
    expect(summary.failures.join("\n")).toMatch(/composition 50%/);
    expect(summary.failures.join("\n")).toMatch(/candidate citations 50%/);
  });

  it("uses the nearest-rank percentile", () => {
    expect(percentile([5, 1, 3], 0.5)).toBe(3);
    expect(percentile([5, 1, 3], 0.95)).toBe(5);
    expect(percentile([], 0.5)).toBe(0);
    expect(THRESHOLDS.invented).toBe(0);
  });
});
