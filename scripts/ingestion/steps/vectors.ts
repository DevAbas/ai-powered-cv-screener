import type { Chunk, IndexEntry } from "@/contracts";
import type { Embedder } from "@/lib/models/embedder";
import type { ChunkMetadata, VectorRecord, VectorStore } from "@/lib/search";
import { sleep } from "../../generation/options";

// The vectors step of `npm run index`: one record per section chunk, keyed
// by the chunk id so re-runs replace rather than duplicate, with the
// metadata the search filters on. One embedding call per CV, with a pause
// between CVs: the Gemini API free tier allows 30,000 embedding tokens a
// minute (Gemini API rate limits), and the whole pool in one call exceeds
// it. Resumable: a CV whose chunks are all stored is skipped unless forced,
// and a CV that fails leaves the others to run.

export interface VectorSyncOptions {
  /** Candidate ids to sync; every indexed CV when omitted. */
  only?: readonly string[];
  /** Re-embed and replace what is already stored. */
  force: boolean;
  /** Wait between CVs, for the embedding model's per-minute limits. @default 0 */
  pauseMs?: number;
  /** A line per CV as it is stored or fails. */
  log?: (id: string, message: string) => void;
}

export interface VectorSyncReport {
  done: string[];
  skipped: string[];
  failed: string[];
}

/** What a chunk's vector is made from: who the candidate is, then the chunk's text. */
export function chunkDocumentText(entry: IndexEntry, chunk: Chunk): string {
  const { name, headline, location } = entry.profile;
  return `${name}: ${headline}, ${location}\n${chunk.text}`;
}

export function chunkMetadata(entry: IndexEntry, chunk: Chunk): ChunkMetadata {
  const { role, seniority, skills, languages } = entry.profile;
  return {
    candidateId: entry.id,
    section: chunk.section,
    page: chunk.page,
    role,
    seniority,
    skills: skills.map((skill) => skill.name),
    languages: languages.map((language) => language.language),
  };
}

export async function syncVectors(
  entries: readonly IndexEntry[],
  deps: { embedder: Embedder; store: VectorStore },
  { only, force, pauseMs = 0, log }: VectorSyncOptions,
): Promise<VectorSyncReport> {
  const wanted = entries.filter((entry) => !only || only.includes(entry.id));
  const todo: IndexEntry[] = [];
  const skipped: string[] = [];
  for (const entry of wanted) {
    const stored = force ? [] : await deps.store.listIds(`${entry.id}:`);
    const complete = !force && entry.chunks.every((chunk) => stored.includes(chunk.id)) && stored.length === entry.chunks.length;
    if (complete) {
      skipped.push(entry.id);
      continue;
    }
    // Stale chunks of a re-indexed CV (a section that moved page) would otherwise linger.
    if (stored.length) await deps.store.deleteMany(stored);
    todo.push(entry);
  }
  const done: string[] = [];
  const failed: string[] = [];
  for (const [index, entry] of todo.entries()) {
    if (index > 0 && pauseMs > 0) await sleep(pauseMs);
    try {
      const vectors = await deps.embedder.embedDocuments(entry.chunks.map((chunk) => chunkDocumentText(entry, chunk)));
      const records: VectorRecord[] = entry.chunks.map((chunk, i) => ({ id: chunk.id, values: vectors[i], metadata: chunkMetadata(entry, chunk) }));
      await deps.store.upsert(records);
      done.push(entry.id);
      log?.(entry.id, `${records.length} vectors stored`);
    } catch (error) {
      failed.push(entry.id);
      log?.(entry.id, `FAILED: ${error instanceof Error ? error.message.split("\n")[0].slice(0, 200) : String(error)}`);
    }
  }
  return { done, skipped, failed };
}
