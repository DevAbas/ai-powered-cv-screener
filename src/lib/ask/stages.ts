import type { ProgressStage } from "@/contracts/ask";

/** Progress messages per stage (PLAN, Retrieval and answering): search the CVs, read the matches, write. */
export const STAGE_MESSAGES: Record<ProgressStage, string> = {
  search: "Searching the CVs",
  read: "Reading the CVs",
  write: "Writing the answer",
};

/** The read stage with how many CVs it reads: "Reading 8 CVs". */
export function readingMessage(count: number): string {
  return `Reading ${count} ${count === 1 ? "CV" : "CVs"}`;
}
