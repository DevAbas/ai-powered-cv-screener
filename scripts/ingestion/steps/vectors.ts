import type { Chunk, IndexEntry } from "@/contracts";
import type { Embedder } from "@/lib/models/embedder";
import type { ChunkMetadata, VectorRecord, VectorStore } from "@/lib/search";

// The vectors step of `npm run index`: one record per
// section chunk, keyed by the chunk id so re-runs replace rather than
// duplicate, with the metadata the search filters on. Resumable: a CV
// whose chunks are all stored is skipped unless forced.

export interface VectorSyncOptions {
  /** Candidate ids to sync; every indexed CV when omitted. */
  only?: readonly string[];
  /** Re-embed and replace what is already stored. */
  force: boolean;
}

export interface VectorSyncReport {
  done: string[];
  skipped: string[];
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
  { only, force }: VectorSyncOptions,
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
  if (todo.length === 0) return { done: [], skipped };

  const pairs = todo.flatMap((entry) => entry.chunks.map((chunk) => ({ entry, chunk })));
  const vectors = await deps.embedder.embedDocuments(pairs.map(({ entry, chunk }) => chunkDocumentText(entry, chunk)));
  const records: VectorRecord[] = pairs.map(({ entry, chunk }, i) => ({ id: chunk.id, values: vectors[i], metadata: chunkMetadata(entry, chunk) }));
  await deps.store.upsert(records);
  return { done: todo.map((entry) => entry.id), skipped };
}
