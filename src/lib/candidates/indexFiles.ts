import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { IndexEntry } from "@/contracts";
import { CandidateIdSchema, IndexEntrySchema } from "@/contracts";
import { cvFileName } from "./cvSource";

// Where the index and the CVs live, and how an index
// file is read: one file per CV, validated against the contract when it is
// loaded. Shared by the app's loader (candidatePool.ts) and the indexer.

export const INDEX_DIR = path.join(process.cwd(), "data", "index");
export const CVS_DIR = path.join(process.cwd(), "data", "cvs");

export const indexEntryPath = (id: string): string => path.join(INDEX_DIR, `${id}.json`);
export const cvPath = (id: string): string => path.join(CVS_DIR, `${id}.pdf`);

/** The entry in `<id>.json`, checked against the contract and against its file name. */
export function parseIndexEntry(fileName: string, json: string): IndexEntry {
  const id = fileName.replace(/\.json$/, "");
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (error) {
    throw new Error(`data/index/${fileName} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = IndexEntrySchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`data/index/${fileName} fails the index contract: ${issues}`);
  }
  if (parsed.data.id !== id) throw new Error(`data/index/${fileName} holds the entry of "${parsed.data.id}"`);
  return parsed.data;
}

/** Every entry in the index folder, sorted by id; an empty folder is an empty index. */
export function readIndexEntries(dir = INDEX_DIR): IndexEntry[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith(".json"));
  } catch {
    throw new Error("The CV index is missing (data/index). Run npm run index.");
  }
  return files
    .sort()
    .map((file) => parseIndexEntry(file, readFileSync(path.join(dir, file), "utf8")));
}

/** The CV file a request may read: only an id present in the index, at the path the index entry names. */
export function resolveCv(byId: ReadonlyMap<string, IndexEntry>, id: string): { file: string; fileName: string } | undefined {
  if (!CandidateIdSchema.safeParse(id).success) return undefined;
  const entry = byId.get(id);
  return entry ? { file: cvPath(entry.id), fileName: cvFileName(entry.id) } : undefined;
}
