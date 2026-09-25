import type { AskEvent } from "@/contracts";
import type { RequestLog } from "@/lib/screening";
import type { ObservedAnswer } from "./score";

// From the pipeline's events and log line to what the scorer reads.

export function observeAnswer(events: readonly AskEvent[], log: RequestLog | undefined, latencyMs: number): ObservedAnswer {
  const last = events.at(-1);
  const toolCandidateIds = log?.candidatesReturned ?? [];
  if (!last || last.type !== "answer") {
    return {
      outcome: "error",
      text: "",
      presented: [],
      reasons: [],
      sources: [],
      toolCandidateIds,
      rejected: log?.rejectedCandidates,
      latencyMs,
      error: last?.type === "error" ? last.message : "no answer event",
    };
  }
  const base = { outcome: "answer" as const, text: last.text, sources: last.sources, toolCandidateIds, latencyMs };
  const view = last.view;
  if (!view) return { ...base, presented: [], reasons: [] };
  switch (view.kind) {
    case "list":
      return {
        ...base,
        view: view.ranked ? "ranked" : view.count ? "count" : "list",
        presented: view.rows.map((row) => row.candidateId),
        reasons: view.rows.map((row) => row.reason),
        count: view.count?.matched,
      };
    case "comparison":
      return { ...base, view: "comparison", presented: view.candidates.map((c) => c.candidateId), reasons: [] };
    case "profile":
      return { ...base, view: "profile", presented: [view.candidate.candidateId], reasons: [] };
    case "status":
      return {
        ...base,
        view: view.status === "no-match" ? "no_match" : view.status === "insufficient" ? "not_enough_information" : "out_of_scope",
        presented: [],
        reasons: [],
      };
  }
}
