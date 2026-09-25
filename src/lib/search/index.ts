// The search module (AGENTS.md, Conventions): finding CV text by meaning
// and keyword, imported from `@/lib/search`. Names are
// listed, not `export *`: the scripts run as ES modules and Node only sees
// the names a CommonJS module declares itself.
// `pineconeStore.ts` and `pineconeEnv.ts` are not here: they build the SDK client
// from the environment; server code imports them by their path.

export { TOP_K_CHUNKS, DEFAULT_LIMIT, EXCERPT_CHARS, hybridSearch } from "./hybridSearch";
export type { HybridHit, HybridDeps, HybridQuery } from "./hybridSearch";

export { foldTerm, createBm25Index } from "./bm25Index";
export type { Bm25Hit, Bm25Index } from "./bm25Index";

export { RRF_K, reciprocalRankFusion } from "./rankFusion";
export type { Fused } from "./rankFusion";

export { VectorStoreError } from "./vectorStore";
export type { ChunkMetadata, VectorRecord, VectorMatch, MetadataFilter, VectorStore } from "./vectorStore";
