// The vector store port (PLAN, Retrieval and answering). The answering
// service and the indexer depend on this interface; `pinecone.ts` is the only
// implementation that talks to a real service.

/** What a CV vector carries besides its values; the CV text itself stays in the index. */
export interface CvVectorMetadata {
  [key: string]: string;
  name: string;
  file: string;
}

export interface VectorRecord {
  /** The candidate id: deterministic, so upserts are idempotent. */
  id: string;
  values: number[];
  metadata: CvVectorMetadata;
}

export interface VectorMatch {
  id: string;
  /** Cosine similarity, higher is closer. */
  score: number;
}

export interface VectorStore {
  /** Inserts or replaces records by id. */
  upsert(records: readonly VectorRecord[]): Promise<void>;
  /** The `topK` closest records, best first. */
  query(vector: readonly number[], topK: number, signal?: AbortSignal): Promise<VectorMatch[]>;
  /** Every stored id. */
  listIds(): Promise<string[]>;
  /** The stored vectors of these ids; an id without a record is left out. */
  fetch(ids: readonly string[]): Promise<Map<string, number[]>>;
}

/** A vector store call failed; the message is for logs, never for the recruiter. */
export class VectorStoreError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VectorStoreError";
  }
}
