import type { ProgressStage } from "@/contracts";

/** Progress messages per stage (PLAN, Retrieval and answering: progress). */
export const STAGE_MESSAGES: Record<ProgressStage, string> = {
  understand: "Understanding the question",
  search: "Searching the CVs",
  write: "Writing the answer",
};

/** What the progress line says while a tool runs, in plain words. */
export function toolMessage(toolName: string, input?: unknown): string {
  switch (toolName) {
    case "find_candidates":
      return "Filtering the CVs";
    case "count_candidates":
      return "Counting the CVs";
    case "get_candidates": {
      const ids = input && typeof input === "object" && Array.isArray((input as { ids?: unknown }).ids) ? (input as { ids: unknown[] }).ids.length : 0;
      return ids > 0 ? `Reading ${ids} ${ids === 1 ? "CV" : "CVs"}` : "Reading the CVs";
    }
    case "search_cv_text":
      return "Searching the CV text";
    default:
      return STAGE_MESSAGES.search;
  }
}
