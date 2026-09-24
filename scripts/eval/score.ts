import type { SectionName } from "@/contracts/candidate";
import type { ExpectedView, GoldenQuestion, QuestionKind, Seeds } from "./types";

// Scoring (PLAN, Evaluation): retrieval, composition and citations are scored
// separately per question, then summarised per model against the thresholds.
// Nothing here calls a model: the runner turns the answer events into an
// `ObservedAnswer`, and the metrics are plain set arithmetic.

/** An answer as the scorer reads it. */
export interface ObservedAnswer {
  outcome: "answer" | "error";
  text: string;
  /** The view or state the answer showed; undefined for a text-only answer. */
  view?: Exclude<ExpectedView, "text">;
  /** The candidate ids the view shows, in its order. */
  presented: readonly string[];
  /** The model's reason per presented row (ranked lists). */
  reasons: readonly string[];
  /** The count a count view shows. */
  count?: number;
  sources: readonly { candidateId: string; page: number }[];
  /** Every candidate id any tool returned during the request. */
  toolCandidateIds: readonly string[];
  latencyMs: number;
  error?: string;
}

/** The pages of each section of a candidate's CV, from the index. */
export type SectionPages = (candidateId: string) => Partial<Record<SectionName, readonly number[]>>;

export interface SetMetrics {
  precision: number;
  recall: number;
  f1: number;
}

export interface QuestionScore {
  id: string;
  kind: QuestionKind;
  /** Exact questions with an expected set. */
  retrieval?: SetMetrics;
  /** Free-text questions: atLeast ⊆ presented ⊆ atMost. */
  withinBounds?: boolean;
  /** The view, count, order, reasons, text and state rules all hold. */
  composition: boolean;
  /** Every presented candidate has a source. */
  candidateCitations: boolean;
  /** The share of sources on the expected section's page; undefined when not applicable. */
  pageCitations?: number;
  /** Presented ids no tool returned. */
  invented: number;
  /** State and text answers: no sources beyond the allowed ones; undefined for other questions. */
  noSourceState?: boolean;
  latencyMs: number;
  /** Everything that went wrong, for the report. */
  problems: string[];
}

const STATE_VIEWS: readonly ExpectedView[] = ["no_match", "not_enough_information", "out_of_scope", "text"];

const unique = (values: readonly string[]) => [...new Set(values)];

/** Precision, recall and F1 of `actual` against `expected`; two empty sets agree perfectly. */
export function setMetrics(expected: readonly string[], actual: readonly string[]): SetMetrics {
  const want = new Set(expected);
  const got = new Set(actual);
  if (want.size === 0 && got.size === 0) return { precision: 1, recall: 1, f1: 1 };
  const hits = [...got].filter((id) => want.has(id)).length;
  const precision = got.size === 0 ? 0 : hits / got.size;
  const recall = want.size === 0 ? 0 : hits / want.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

export function scoreQuestion(question: GoldenQuestion, observed: ObservedAnswer, seeds: Seeds, sectionPages: SectionPages): QuestionScore {
  const { expect } = question;
  const accepted: readonly ExpectedView[] = Array.isArray(expect.view) ? expect.view : [expect.view as ExpectedView];
  const problems: string[] = [];
  const presented = unique(observed.presented);
  const stateQuestion = accepted.every((view) => STATE_VIEWS.includes(view));

  if (observed.outcome === "error") {
    return {
      id: question.id,
      kind: question.kind,
      retrieval: expect.candidates ? setMetrics(expect.candidates(seeds), []) : undefined,
      withinBounds: expect.atLeast || expect.atMost ? false : undefined,
      composition: false,
      candidateCitations: false,
      invented: 0,
      noSourceState: stateQuestion ? false : undefined,
      latencyMs: observed.latencyMs,
      problems: [`error: ${observed.error ?? "unknown"}`],
    };
  }

  const shown: ExpectedView = observed.view ?? "text";
  if (!accepted.includes(shown)) problems.push(`view ${shown}, expected ${accepted.join(" or ")}`);
  if (shown === "text" && presented.length > 0) problems.push("a text answer presented candidates");

  let retrieval: SetMetrics | undefined;
  if (expect.candidates) {
    const expected = expect.candidates(seeds);
    // A count answered without its list has no set to score; with the list, the rows must match.
    if (shown !== "count" || presented.length > 0 || expect.rowsRequired) retrieval = setMetrics(expected, presented);
    if (expect.rowsRequired && retrieval && retrieval.f1 < 1) problems.push("the rows differ from the expected list");
  }

  let withinBounds: boolean | undefined;
  if (expect.atLeast || expect.atMost) {
    const atLeast = expect.atLeast?.(seeds) ?? [];
    const atMost = new Set(expect.atMost?.(seeds) ?? presented);
    withinBounds = atLeast.every((id) => presented.includes(id)) && presented.every((id) => atMost.has(id));
    if (!withinBounds) problems.push("the candidates fall outside the expected bounds");
  }

  if (expect.count) {
    const count = expect.count(seeds);
    if (observed.count !== count) problems.push(`count ${observed.count ?? "none"}, expected ${count}`);
  }
  if (expect.rows !== undefined && presented.length !== expect.rows) problems.push(`${presented.length} rows, expected ${expect.rows}`);
  if (expect.eligible) {
    const eligible = new Set(expect.eligible(seeds));
    const outsiders = presented.filter((id) => !eligible.has(id));
    if (outsiders.length) problems.push(`not eligible: ${outsiders.join(", ")}`);
  }
  if (expect.mustInclude) {
    const missing = expect.mustInclude(seeds).filter((id) => !presented.includes(id));
    if (missing.length) problems.push(`missing: ${missing.join(", ")}`);
  }
  if (expect.first) {
    const first = expect.first(seeds);
    if (presented[0] !== first) problems.push(`first row ${presented[0] ?? "none"}, expected ${first}`);
  }
  if (shown === "ranked" && observed.reasons.filter((reason) => reason.trim()).length < presented.length) problems.push("a ranked row has no reason");
  if (expect.textIncludes) {
    const text = observed.text.toLowerCase();
    for (const needle of expect.textIncludes(seeds)) {
      if (!text.includes(needle.toLowerCase())) problems.push(`text lacks "${needle}"`);
    }
  }
  if (expect.nextQuestion && !observed.text.trim().endsWith("?")) problems.push("no next question");

  let noSourceState: boolean | undefined;
  if (stateQuestion) {
    const allowed = new Set(expect.sourcesWithin?.(seeds) ?? []);
    noSourceState = observed.sources.every((source) => allowed.has(source.candidateId));
    if (!noSourceState) problems.push("sources on a state answer");
  }

  const candidateCitations = presented.every((id) => observed.sources.some((source) => source.candidateId === id));
  if (!candidateCitations) problems.push("a presented candidate has no source");

  let pageCitations: number | undefined;
  if (expect.section && observed.sources.length > 0) {
    const section = expect.section;
    const right = observed.sources.filter((source) => (sectionPages(source.candidateId)[section] ?? []).includes(source.page)).length;
    pageCitations = right / observed.sources.length;
    if (pageCitations < 1) problems.push(`${observed.sources.length - right} source(s) not on the ${section} page`);
  }

  const tools = new Set(observed.toolCandidateIds);
  const invented = presented.filter((id) => !tools.has(id));
  if (invented.length) problems.push(`invented: ${invented.join(", ")}`);

  const composition = !problems.some(
    (problem) => !problem.startsWith("invented") && !problem.startsWith("a presented candidate") && !problem.endsWith("page") && !problem.startsWith("the candidates fall"),
  );

  return {
    id: question.id,
    kind: question.kind,
    retrieval,
    withinBounds,
    composition,
    candidateCitations,
    pageCitations,
    invented: invented.length,
    noSourceState,
    latencyMs: observed.latencyMs,
    problems,
  };
}

/** The thresholds a model must meet to be offered (PLAN, Evaluation). */
export const THRESHOLDS = {
  invented: 0,
  candidateCitations: 1,
  pageCitations: 0.95,
  exactF1: 0.95,
  freeWithinBounds: 0.8,
  composition: 0.9,
  noSourceStates: 1,
} as const;

export interface ModelSummary {
  questions: number;
  errors: number;
  invented: number;
  candidateCitations: number;
  pageCitations: number;
  exactF1: number;
  freeWithinBounds: number;
  composition: number;
  noSourceStates: number;
  latency: { p50: number; p95: number };
  passes: boolean;
  /** The thresholds not met, in words. */
  failures: string[];
}

const mean = (values: readonly number[]) => (values.length === 0 ? 1 : values.reduce((a, b) => a + b, 0) / values.length);
const rate = (values: readonly boolean[]) => mean(values.map((v) => (v ? 1 : 0)));

/** The nearest-rank percentile of `values` (Hyndman & Fan type 1). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

export function summarize(scores: readonly QuestionScore[]): ModelSummary {
  const defined = <T>(values: readonly (T | undefined)[]): T[] => values.filter((v): v is T => v !== undefined);
  const summary = {
    questions: scores.length,
    errors: scores.filter((s) => s.problems.some((p) => p.startsWith("error:"))).length,
    invented: scores.reduce((sum, s) => sum + s.invented, 0),
    candidateCitations: rate(scores.map((s) => s.candidateCitations)),
    pageCitations: mean(defined(scores.map((s) => s.pageCitations))),
    exactF1: mean(defined(scores.filter((s) => s.kind === "exact").map((s) => s.retrieval?.f1))),
    freeWithinBounds: rate(defined(scores.map((s) => s.withinBounds))),
    composition: rate(scores.map((s) => s.composition)),
    noSourceStates: rate(defined(scores.map((s) => s.noSourceState))),
    latency: { p50: percentile(scores.map((s) => s.latencyMs), 0.5), p95: percentile(scores.map((s) => s.latencyMs), 0.95) },
  };
  const failures: string[] = [];
  if (summary.invented > THRESHOLDS.invented) failures.push(`invented candidates ${summary.invented} (max ${THRESHOLDS.invented})`);
  if (summary.candidateCitations < THRESHOLDS.candidateCitations) failures.push(`candidate citations ${pct(summary.candidateCitations)} (min ${pct(THRESHOLDS.candidateCitations)})`);
  if (summary.pageCitations < THRESHOLDS.pageCitations) failures.push(`page citations ${pct(summary.pageCitations)} (min ${pct(THRESHOLDS.pageCitations)})`);
  if (summary.exactF1 < THRESHOLDS.exactF1) failures.push(`exact-question F1 ${pct(summary.exactF1)} (min ${pct(THRESHOLDS.exactF1)})`);
  if (summary.freeWithinBounds < THRESHOLDS.freeWithinBounds) failures.push(`free-text questions within bounds ${pct(summary.freeWithinBounds)} (min ${pct(THRESHOLDS.freeWithinBounds)})`);
  if (summary.composition < THRESHOLDS.composition) failures.push(`composition ${pct(summary.composition)} (min ${pct(THRESHOLDS.composition)})`);
  if (summary.noSourceStates < THRESHOLDS.noSourceStates) failures.push(`no-source states ${pct(summary.noSourceStates)} (min ${pct(THRESHOLDS.noSourceStates)})`);
  return { ...summary, passes: failures.length === 0, failures };
}

export const pct = (value: number): string => `${Math.round(value * 1000) / 10}%`;
