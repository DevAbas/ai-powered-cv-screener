import type { ChunkMetadata, MetadataFilter, VectorMatch, VectorRecord, VectorStore } from "./vector-store";

// An in-memory VectorStore: the fake for tests, with the same cosine ranking
// and the same filter semantics the real index uses.

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * (b[i] ?? 0);
    normA += a[i] * a[i];
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

/** True when the metadata satisfies the filter; a list field matches when any of its values does. */
export function matchesFilter(metadata: ChunkMetadata, filter?: MetadataFilter): boolean {
  if (!filter) return true;
  if ("$and" in filter && Array.isArray(filter.$and)) return filter.$and.every((part) => matchesFilter(metadata, part));
  return Object.entries(filter as Record<string, { $eq: string | number } | { $in: (string | number)[] }>).every(([field, condition]) => {
    const value = metadata[field];
    const values: (string | number)[] = Array.isArray(value) ? value : value === undefined ? [] : [value];
    if ("$eq" in condition) return values.includes(condition.$eq);
    return condition.$in.some((wanted) => values.includes(wanted));
  });
}

export function createInMemoryStore(initial: readonly VectorRecord[] = []): VectorStore & { records: Map<string, VectorRecord> } {
  const records = new Map(initial.map((r) => [r.id, r]));
  return {
    records,
    async upsert(batch) {
      for (const record of batch) records.set(record.id, record);
    },
    async query(vector, topK, filter) {
      const matches: VectorMatch[] = [...records.values()]
        .filter((r) => matchesFilter(r.metadata, filter))
        .map((r) => ({ id: r.id, score: cosineSimilarity(vector, r.values), metadata: r.metadata }));
      return matches.sort((a, b) => b.score - a.score).slice(0, topK);
    },
    async listIds(prefix = "") {
      return [...records.keys()].filter((id) => id.startsWith(prefix));
    },
    async deleteMany(ids) {
      for (const id of ids) records.delete(id);
    },
    async deleteAll() {
      records.clear();
    },
  };
}
