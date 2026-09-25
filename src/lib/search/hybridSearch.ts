import type { IndexEntry, SectionName } from "@/contracts";
import type { Embedder } from "@/lib/models/embedder";
import type { MetadataFilter, VectorStore } from "./vectorStore";
import type { Bm25Index } from "./bm25Index";
import { reciprocalRankFusion, RRF_K } from "./rankFusion";

// Free-text questions over the CVs: the query embedded and searched in the
// vector store under a metadata filter, BM25 over the same chunks in the same
// scope, the two rankings merged with reciprocal rank fusion (k = 60), then
// grouped by candidate so each appears once with its best chunk.

/** Chunks asked of each side; the pool has ~230 chunks, so this is generous. */
export const TOP_K_CHUNKS = 50;
/** Candidates returned when the tool call names no limit. */
export const DEFAULT_LIMIT = 10;
/** Characters of the best chunk shown as the excerpt. */
export const EXCERPT_CHARS = 300;

export interface HybridHit {
  id: string;
  name: string;
  headline: string;
  section: SectionName;
  page: number;
  excerpt: string;
  score: number;
}

export interface HybridDeps {
  entries: readonly IndexEntry[];
  embedder: Embedder;
  store: VectorStore;
  bm25: Bm25Index;
}

export interface HybridQuery {
  query: string;
  /** The candidates the search may return; everyone when undefined. */
  scope?: ReadonlySet<string>;
  limit?: number;
  signal?: AbortSignal;
}

export async function hybridSearch({ query, scope, limit = DEFAULT_LIMIT, signal }: HybridQuery, deps: HybridDeps): Promise<HybridHit[]> {
  if (scope && scope.size === 0) return [];
  const byId = new Map(deps.entries.map((entry) => [entry.id, entry]));
  const filter: MetadataFilter | undefined = scope ? { candidateId: { $in: [...scope] } } : undefined;

  const vector = await deps.embedder.embedQuery(query, signal);
  const dense = (await deps.store.query(vector, TOP_K_CHUNKS, filter, signal)).map((match) => match.id);
  const sparse = deps.bm25.search(query, { scope, limit: TOP_K_CHUNKS }).map((hit) => hit.chunkId);
  const fused = reciprocalRankFusion([dense, sparse], RRF_K);

  const hits: HybridHit[] = [];
  const seen = new Set<string>();
  for (const { id: chunkId, score } of fused) {
    const [candidateId] = chunkId.split(":");
    const entry = byId.get(candidateId ?? "");
    const chunk = entry?.chunks.find((c) => c.id === chunkId);
    if (!entry || !chunk || seen.has(entry.id)) continue;
    seen.add(entry.id);
    hits.push({
      id: entry.id,
      name: entry.profile.name,
      headline: entry.profile.headline,
      section: chunk.section,
      page: chunk.page,
      excerpt: chunk.text.slice(0, EXCERPT_CHARS),
      score,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}
