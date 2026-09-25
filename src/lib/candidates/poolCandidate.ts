import type { CandidateProfile, IndexEntry } from "@/contracts";

/** What the page sends the client about one CV: a subset of its index entry. */
export type PoolCandidate = Pick<IndexEntry, "id" | "pages"> & {
  profile: Pick<CandidateProfile, "name" | "headline" | "role" | "seniority" | "location">;
};
