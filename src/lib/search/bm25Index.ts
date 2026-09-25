import MiniSearch from "minisearch";
import type { Chunk, IndexEntry, SectionName } from "@/contracts";

// The keyword side of hybrid search (PLAN, Retrieval and answering): BM25+
// over the section chunks with MiniSearch at its documented defaults
// (k 1.2, b 0.7, d 0.5). Terms are whole words split on Unicode space and
// punctuation (the library's tokenizer), so a word never matches inside
// another; case and accents are folded, nothing else is processed: no
// stop words, no stemming.

export interface Bm25Hit {
  chunkId: string;
  candidateId: string;
  section: SectionName;
  page: number;
  score: number;
}

export interface Bm25Index {
  /** Chunks ranked by BM25+ score, best first, among the candidates in `scope` (everyone when undefined). */
  search(query: string, options?: { scope?: ReadonlySet<string>; limit?: number }): Bm25Hit[];
  readonly size: number;
}

interface Document {
  id: string;
  candidateId: string;
  section: SectionName;
  page: number;
  text: string;
}

/** Case and accents folded: Unicode compatibility decomposition with the combining marks dropped. */
export const foldTerm = (term: string): string => term.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function createBm25Index(entries: readonly IndexEntry[]): Bm25Index {
  const index = new MiniSearch<Document>({
    fields: ["text"],
    storeFields: ["candidateId", "section", "page"],
    idField: "id",
    processTerm: foldTerm,
  });
  index.addAll(entries.flatMap((entry) => entry.chunks.map((chunk: Chunk): Document => ({ ...chunk, candidateId: entry.id }))));

  return {
    size: index.documentCount,
    search(query, { scope, limit } = {}) {
      const results = index.search(query, { filter: scope ? (result) => scope.has(result.candidateId as string) : undefined });
      const hits = results.map(
        (result): Bm25Hit => ({
          chunkId: result.id as string,
          candidateId: result.candidateId as string,
          section: result.section as SectionName,
          page: result.page as number,
          score: result.score,
        }),
      );
      return limit === undefined ? hits : hits.slice(0, limit);
    },
  };
}
