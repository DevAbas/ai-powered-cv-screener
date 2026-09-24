import { Pinecone } from "@pinecone-database/pinecone";
import { pineconeEnv } from "@/lib/env";
import type { CvVectorMetadata, VectorMatch, VectorRecord, VectorStore } from "./vector-store";
import { VectorStoreError } from "./vector-store";

// The Pinecone implementation of VectorStore: the only module that imports the
// Pinecone SDK. One client per store, the index addressed by name (the SDK
// resolves and caches its host), CV vectors in one namespace.

/** The namespace CV vectors live in. */
export const CV_NAMESPACE = "cvs";

/** Records per upsert request; well under Pinecone's request size limit for 768-dimension vectors. */
const UPSERT_BATCH = 100;

export interface PineconeStoreOptions {
  apiKey: string;
  indexName: string;
  /** Vector length the index is created with; must match the embedding model. */
  dimensions: number;
  namespace?: string;
}

export interface PineconeStore extends VectorStore {
  /** Creates the serverless index when it does not exist yet, and waits until it is ready. */
  ensureIndex(): Promise<void>;
}

/** Runs one SDK call, turning any failure into a VectorStoreError that names the operation. */
async function call<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new VectorStoreError(`Pinecone ${operation} failed: ${reason}`, { cause: error });
  }
}

export function createPineconeStore({ apiKey, indexName, dimensions, namespace = CV_NAMESPACE }: PineconeStoreOptions): PineconeStore {
  const client = new Pinecone({ apiKey });
  const index = client.index<CvVectorMetadata>({ name: indexName, namespace });

  return {
    async ensureIndex() {
      await call("index creation", () =>
        client.indexes.create({
          name: indexName,
          schema: { fields: { _values: { type: "dense_vector", dimension: dimensions, metric: "cosine" } } },
          // The free Starter plan serves serverless indexes on AWS us-east-1.
          deployment: { deploymentType: "managed", cloud: "aws", region: "us-east-1" },
          waitUntilReady: true,
          suppressConflicts: true,
        }),
      );
    },

    async upsert(records: readonly VectorRecord[]) {
      for (let i = 0; i < records.length; i += UPSERT_BATCH) {
        const batch = records.slice(i, i + UPSERT_BATCH).map(({ id, values, metadata }) => ({ id, values, metadata }));
        await call("upsert", () => index.upsert({ records: batch }));
      }
    },

    // The SDK takes no abort signal for queries; a question that is stopped simply ignores the result.
    async query(vector: readonly number[], topK: number): Promise<VectorMatch[]> {
      const response = await call("query", () => index.query({ vector: [...vector], topK, includeMetadata: false }));
      return response.matches.map((match) => ({ id: match.id, score: match.score ?? 0 }));
    },

    async listIds() {
      const ids: string[] = [];
      let paginationToken: string | undefined;
      do {
        const page = await call("list", () => index.listPaginated({ paginationToken }));
        for (const item of page.vectors ?? []) if (item.id) ids.push(item.id);
        paginationToken = page.pagination?.next;
      } while (paginationToken);
      return ids;
    },

    async fetch(ids: readonly string[]) {
      if (ids.length === 0) return new Map<string, number[]>();
      const response = await call("fetch", () => index.fetch({ ids: [...ids] }));
      return new Map(Object.entries(response.records).flatMap(([id, record]): [string, number[]][] => (record.values ? [[id, record.values]] : [])));
    },
  };
}

/** The CV vector store from the environment (PINECONE_API_KEY, PINECONE_INDEX). */
export function pineconeStoreFromEnv(dimensions: number): PineconeStore {
  const env = pineconeEnv();
  return createPineconeStore({ apiKey: env.PINECONE_API_KEY, indexName: env.PINECONE_INDEX, dimensions });
}
