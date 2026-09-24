import type { VectorMatch, VectorRecord, VectorStore } from "./vector-store";

// An in-memory VectorStore: the fake for tests, with the same cosine ranking
// the real index uses.

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

export function createInMemoryStore(initial: readonly VectorRecord[] = []): VectorStore & { records: Map<string, VectorRecord> } {
  const records = new Map(initial.map((r) => [r.id, r]));
  return {
    records,
    async upsert(batch) {
      for (const record of batch) records.set(record.id, record);
    },
    async query(vector, topK) {
      const matches: VectorMatch[] = [...records.values()].map((r) => ({ id: r.id, score: cosineSimilarity(vector, r.values) }));
      return matches.sort((a, b) => b.score - a.score).slice(0, topK);
    },
    async listIds() {
      return [...records.keys()];
    },
    async fetch(ids) {
      return new Map(ids.flatMap((id): [string, number[]][] => {
        const record = records.get(id);
        return record ? [[id, record.values]] : [];
      }));
    },
  };
}
