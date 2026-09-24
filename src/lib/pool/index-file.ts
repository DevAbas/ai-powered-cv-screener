import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { IndexEntry } from "@/contracts/candidate";
import { IndexEntrySchema } from "@/contracts/candidate";
import type { PoolCandidate } from "./candidate";

// The index (PLAN, Indexer): one entry per CV in `public/cvs`, written by
// `npm run index` and committed. Server and scripts only (reads the file
// system). The app reads only this file and the CV PDFs (PLAN, Data access).

export const INDEX_FILE = path.join(process.cwd(), "data", "index.json");

export const IndexSchema = z.array(IndexEntrySchema);

let cached: { mtimeMs: number; entries: readonly IndexEntry[] } | undefined;

/** Every indexed CV, sorted by id. Parsed once, and again only when the file changes. */
export function loadIndex(): readonly IndexEntry[] {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(INDEX_FILE).mtimeMs;
  } catch {
    throw new Error("The CV index is missing (data/index.json). Run npm run index.");
  }
  if (cached?.mtimeMs !== mtimeMs) {
    cached = { mtimeMs, entries: IndexSchema.parse(JSON.parse(readFileSync(INDEX_FILE, "utf8"))) };
  }
  return cached.entries;
}

/** What the screen needs of an entry: no page text reaches the client. */
export function toPoolCandidate(entry: IndexEntry): PoolCandidate {
  const { name, headline, role, seniority, location } = entry.profile;
  return { id: entry.id, pages: entry.pages, profile: { name, headline, role, seniority, location } };
}
