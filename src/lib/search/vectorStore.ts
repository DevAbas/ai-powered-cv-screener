import type { SectionName } from "@/contracts";

// The vector store port (PLAN, Vector store): one record per section chunk.
// The answering service and the indexer depend on this interface;
// `pineconeStore.ts` is the only implementation that talks to a real service.

/** What a chunk vector carries besides its values: enough to filter by without the index. */
export interface ChunkMetadata {
  [key: string]: string | number | string[];
  candidateId: string;
  section: SectionName;
  page: number;
  role: string;
  seniority: string;
  skills: string[];
  languages: string[];
}

export interface VectorRecord {
  /** The chunk id, `<candidateId>:<section>:<page>`: deterministic, so upserts are idempotent. */
  id: string;
  values: number[];
  metadata: ChunkMetadata;
}

export interface VectorMatch {
  id: string;
  /** Cosine similarity, higher is closer. */
  score: number;
  metadata?: ChunkMetadata;
}

/** A metadata filter in Pinecone's syntax, the subset the app uses: `$eq`, `$in` (any of, also on list fields) and `$and`. */
export type MetadataFilter = { $and: MetadataFilter[] } | Record<string, { $eq: string | number } | { $in: (string | number)[] }>;

export interface VectorStore {
  /** Inserts or replaces records by id. */
  upsert(records: readonly VectorRecord[]): Promise<void>;
  /** The `topK` closest records among those matching `filter`, best first, with their metadata. */
  query(vector: readonly number[], topK: number, filter?: MetadataFilter, signal?: AbortSignal): Promise<VectorMatch[]>;
  /** Every stored id, or those starting with `prefix`. */
  listIds(prefix?: string): Promise<string[]>;
  deleteMany(ids: readonly string[]): Promise<void>;
  /** Empties the namespace. */
  deleteAll(): Promise<void>;
}

/** A vector store call failed; the message is for logs, never for the recruiter. */
export class VectorStoreError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VectorStoreError";
  }
}
