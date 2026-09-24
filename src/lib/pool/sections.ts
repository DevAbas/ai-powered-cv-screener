import type { Chunk, SectionName } from "@/contracts/candidate";
import { SECTION_NAMES } from "@/contracts/candidate";
import { chunkId } from "./chunks";

// Splitting a CV at its own section boundaries (PLAN, Indexer): a line
// that equals one of the contract's section names, case aside, starts a
// section; the text before the first heading on page 1 is the header; a
// section that continues on the next page gives one chunk per page. A CV
// with no known heading is one `other` chunk per page.

const HEADINGS: ReadonlyMap<string, SectionName> = new Map(
  SECTION_NAMES.filter((name) => name !== "header" && name !== "other").map((name) => [name, name]),
);

/** The section a line starts, if it is a heading. */
export function headingOf(line: string): SectionName | undefined {
  return HEADINGS.get(line.trim().toLowerCase());
}

export function splitSections(candidateId: string, pageTexts: readonly string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let section: SectionName | undefined;

  pageTexts.forEach((text, i) => {
    const page = i + 1;
    let current: SectionName = section ?? (page === 1 ? "header" : "other");
    let lines: string[] = [];
    // A heading alone at the foot of a page is no chunk: its text starts on the next page.
    const flush = () => {
      if (lines.some((line) => line.trim() && headingOf(line) === undefined)) {
        chunks.push({ id: chunkId(candidateId, current, page), section: current, page, text: lines.join("\n") });
      }
      lines = [];
    };
    for (const line of text.split("\n")) {
      const heading = headingOf(line);
      if (heading) {
        flush();
        current = heading;
        section = heading;
      }
      lines.push(line);
    }
    flush();
  });

  return chunks;
}
