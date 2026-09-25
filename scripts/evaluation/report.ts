import type { ModelSummary, QuestionScore } from "./score";
import { pct, THRESHOLDS } from "./score";

// The evaluation report: one section per model with its
// metrics against the thresholds and the questions that failed.

export interface ModelReport {
  /** The model name under evaluation. */
  model: string;
  startedAt: string;
  summary: ModelSummary;
  scores: readonly QuestionScore[];
}

function row(label: string, value: string, threshold: string, ok: boolean): string {
  return `| ${label} | ${value} | ${threshold} | ${ok ? "pass" : "fail"} |`;
}

export function formatModelReport(report: ModelReport): string {
  const { summary } = report;
  const lines = [
    `## ${report.model}`,
    "",
    `Run ${report.startedAt}, ${summary.questions} question(s), ${summary.errors} error(s): **${summary.passes ? "PASS" : "FAIL"}**.`,
    "",
    "| Metric | Value | Threshold | |",
    "|---|---|---|---|",
    row("Invented candidates", String(summary.invented), `≤ ${THRESHOLDS.invented}`, summary.invented <= THRESHOLDS.invented),
    row("Candidate citations", pct(summary.candidateCitations), `≥ ${pct(THRESHOLDS.candidateCitations)}`, summary.candidateCitations >= THRESHOLDS.candidateCitations),
    row("Page citations", pct(summary.pageCitations), `≥ ${pct(THRESHOLDS.pageCitations)}`, summary.pageCitations >= THRESHOLDS.pageCitations),
    row("Retrieval F1, exact questions", pct(summary.exactF1), `≥ ${pct(THRESHOLDS.exactF1)}`, summary.exactF1 >= THRESHOLDS.exactF1),
    row("Free-text within bounds", pct(summary.freeWithinBounds), `≥ ${pct(THRESHOLDS.freeWithinBounds)}`, summary.freeWithinBounds >= THRESHOLDS.freeWithinBounds),
    row("Composition", pct(summary.composition), `≥ ${pct(THRESHOLDS.composition)}`, summary.composition >= THRESHOLDS.composition),
    row("States without sources", pct(summary.noSourceStates), `≥ ${pct(THRESHOLDS.noSourceStates)}`, summary.noSourceStates >= THRESHOLDS.noSourceStates),
    `| Latency P50 / P95 | ${(summary.latency.p50 / 1000).toFixed(1)} s / ${(summary.latency.p95 / 1000).toFixed(1)} s | reported | |`,
    "",
  ];
  const failing = report.scores.filter((score) => score.problems.length > 0);
  if (failing.length) {
    lines.push("Questions with problems:", "");
    for (const score of failing) lines.push(`- ${score.id}: ${score.problems.join("; ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

export function formatReports(reports: readonly ModelReport[]): string {
  return [`# Evaluation`, "", ...reports.map(formatModelReport)].join("\n");
}
