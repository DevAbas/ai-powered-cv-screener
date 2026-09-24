import type { Chunk, IndexEntry, SectionName } from "@/contracts/candidate";

// Reading an entry's chunks (PLAN, Indexer): the text of a page, and the
// pages each section falls on.

/** The chunk id: `<candidateId>:<section>:<page>`, also the vector's id. */
export const chunkId = (candidateId: string, section: SectionName, page: number): string => `${candidateId}:${section}:${page}`;

/** The chunks of one page, in order. */
export function pageChunks(entry: IndexEntry, page: number): Chunk[] {
  return entry.chunks.filter((chunk) => chunk.page === page);
}

/** The text of every page, in order: the page's chunks joined. */
export function pageTexts(entry: IndexEntry): string[] {
  return Array.from({ length: entry.pages }, (_, i) =>
    pageChunks(entry, i + 1)
      .map((chunk) => chunk.text)
      .join("\n"),
  );
}

/** The pages each section of the CV falls on. */
export function sectionPages(entry: IndexEntry): Partial<Record<SectionName, number[]>> {
  const pages: Partial<Record<SectionName, number[]>> = {};
  for (const chunk of entry.chunks) {
    const list = (pages[chunk.section] ??= []);
    if (!list.includes(chunk.page)) list.push(chunk.page);
  }
  return pages;
}
