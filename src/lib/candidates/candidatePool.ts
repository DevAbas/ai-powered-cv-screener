import "server-only";
import type { CandidateProfile, IndexEntry } from "@/contracts";
import type { PoolCandidate } from "./poolCandidate";
import { readIndexEntries } from "./indexFiles";

// The pool: the index folder, read once per process
// and kept in memory. Server only: Next refuses this module in a client
// bundle, and it reads the file system.

export interface Pool {
  entries: readonly IndexEntry[];
  byId: ReadonlyMap<string, IndexEntry>;
}

let pool: Pool | undefined;

/** Every indexed CV, loaded and validated on the first call. */
export function loadPool(): Pool {
  if (!pool) {
    const entries = readIndexEntries();
    pool = { entries, byId: new Map(entries.map((entry) => [entry.id, entry])) };
  }
  return pool;
}

/** What the screen needs of an entry: no page text reaches the client. */
export function toPoolCandidate(entry: IndexEntry): PoolCandidate {
  const { name, headline, role, seniority, location }: CandidateProfile = entry.profile;
  return { id: entry.id, pages: entry.pages, profile: { name, headline, role, seniority, location } };
}
