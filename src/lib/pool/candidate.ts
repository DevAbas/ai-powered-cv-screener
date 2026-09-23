import type { CandidateProfile, IndexEntry } from "@/contracts/candidate";

/** What the pool panel shows for one CV: a subset of its index entry. */
export type PoolCandidate = Pick<IndexEntry, "id" | "pages"> & {
  profile: Pick<CandidateProfile, "name" | "headline" | "role" | "seniority" | "location">;
};
