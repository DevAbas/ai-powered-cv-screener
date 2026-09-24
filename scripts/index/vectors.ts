import type { IndexEntry } from "@/contracts/candidate";
import type { Embedder } from "@/lib/ai/embedder";
import type { VectorRecord, VectorStore } from "@/lib/vector/vector-store";

// The vectors step of `npm run index` (PLAN, Indexer): one vector per indexed
// CV in the vector store, keyed by candidate id so re-runs replace rather than
// duplicate. Resumable: ids already stored are skipped unless forced.

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

/** What a CV's vector is made from: who the candidate is, then the whole CV text. */
export function documentText(entry: IndexEntry): string {
  const { name, headline, location } = entry.profile;
  return [`${name}: ${headline}, ${location}`, ...entry.text].join("\n");
}

export async function syncVectors(
  entries: readonly IndexEntry[],
  deps: { embedder: Embedder; store: VectorStore },
  { only, force }: VectorSyncOptions,
): Promise<VectorSyncReport> {
  const wanted = entries.filter((entry) => !only || only.includes(entry.id));
  const stored = force ? new Set<string>() : new Set(await deps.store.listIds());
  const todo = wanted.filter((entry) => !stored.has(entry.id));
  const skipped = wanted.filter((entry) => stored.has(entry.id)).map((entry) => entry.id);
  if (todo.length === 0) return { done: [], skipped };

  const vectors = await deps.embedder.embedDocuments(todo.map(documentText));
  const records: VectorRecord[] = todo.map((entry, i) => ({
    id: entry.id,
    values: vectors[i],
    metadata: { name: entry.profile.name, file: entry.file },
  }));
  await deps.store.upsert(records);
  return { done: todo.map((entry) => entry.id), skipped };
}
