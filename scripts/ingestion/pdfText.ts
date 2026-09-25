import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

// Text per page of a CV, with pdf.js: the same library that
// draws the in-app preview, so a cited page is the page the recruiter sees.

/** A heading set in spaced capitals, as extracted: "S U M M A RY", "L A N G UAG E S". */
const SPACED_CAPITALS = /^[A-Z]{1,3}(?: +[A-Z]{1,3}){2,}$/;

/** Rejoins headings set in spaced capitals; two or more spaces separate words. */
export function joinSpacedCapitals(line: string): string {
  if (!SPACED_CAPITALS.test(line)) return line;
  return line
    .split(/ {2,}/)
    .map((word) => word.replace(/ /g, ""))
    .join(" ");
}

/** Lines trimmed, blank lines dropped, headings rejoined. */
export function cleanPageText(text: string): string {
  return text
    .split("\n")
    .map((line) => joinSpacedCapitals(line.trim()))
    .filter(Boolean)
    .join("\n");
}

/** The text of every page, in order. */
export async function pdfPageTexts(data: Uint8Array): Promise<string[]> {
  const task = getDocument({ data, verbosity: VerbosityLevel.ERRORS });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : "")).join("");
      pages.push(cleanPageText(text));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
