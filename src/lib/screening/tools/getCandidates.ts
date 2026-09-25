import type { CandidateProfile, FieldSource } from "@/contracts";
import type { ToolDeps } from "./toolDependencies";

export interface CandidateDetails {
  id: string;
  profile: CandidateProfile;
  /** The page and section each profile field was read from, by field path. */
  sources: Record<string, FieldSource>;
  pages: number;
}

export function getCandidates(ids: readonly string[], deps: ToolDeps): CandidateDetails[] {
  const byId = new Map(deps.entries.map((entry) => [entry.id, entry]));
  return ids.map((id) => {
    const entry = byId.get(id);
    if (!entry) throw new Error(`No candidate has the id "${id}"; use an id from the directory.`);
    return { id: entry.id, profile: entry.profile, sources: entry.sources, pages: entry.pages };
  });
}
