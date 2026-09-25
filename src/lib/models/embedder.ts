import { embed, embedMany } from "ai";
import { embeddingModel } from "./modelProviders";
import type { ModelEntry } from "./modelRegistry";

// The embedding port (PLAN, Retrieval and answering): services depend on this
// interface, never on an SDK, so tests pass a fake and the model can change
// in one place.

export interface Embedder {
  /** Vector length every call returns. */
  readonly dimensions: number;
  /** One vector per document, in order. */
  embedDocuments(texts: readonly string[], signal?: AbortSignal): Promise<number[][]>;
  /** One vector for a search query. */
  embedQuery(text: string, signal?: AbortSignal): Promise<number[]>;
}

/** Embedder for a registry `embed` entry through the AI SDK. */
export function createEmbedder(entry: ModelEntry): Embedder {
  const dimensions = entry.dimensions;
  if (!entry.capabilities.embedding || dimensions === undefined) {
    throw new Error(`Registry entry "${entry.id}" is not an embedding model`);
  }
  const model = () => embeddingModel(entry);
  // Documents and queries are embedded for their role, which Gemini embeddings tune for.
  const options = (taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") => ({
    google: { outputDimensionality: dimensions, taskType },
  });
  return {
    dimensions,
    async embedDocuments(texts, signal) {
      if (texts.length === 0) return [];
      const { embeddings } = await embedMany({
        model: model(),
        values: [...texts],
        providerOptions: options("RETRIEVAL_DOCUMENT"),
        abortSignal: signal,
      });
      return embeddings;
    },
    async embedQuery(text, signal) {
      const { embedding } = await embed({ model: model(), value: text, providerOptions: options("RETRIEVAL_QUERY"), abortSignal: signal });
      return embedding;
    },
  };
}
