// Pure helpers of the PDF step.

/** Page count a CV may have; the indexer keeps text per page. */
export const MAX_PAGES = 3;

/**
 * Pages in a rendered PDF. pdfkit writes object dictionaries uncompressed
 * (only content streams are deflated), so page objects can be counted in
 * the bytes; `/Type /Pages` is the tree node, not a page.
 */
export function countPdfPages(pdf: Uint8Array): number {
  const text = Buffer.from(pdf).toString("latin1");
  return text.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2021-04" → "Apr 2021"; null → "Present". */
export function formatMonth(yearMonth: string | null): string {
  if (yearMonth === null) return "Present";
  const [year, month] = yearMonth.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "2021-04" → "04/2021"; null → "Present". */
export function formatMonthNumeric(yearMonth: string | null): string {
  if (yearMonth === null) return "Present";
  const [year, month] = yearMonth.split("-");
  return `${month}/${year}`;
}

const DEGREE_LABELS: Record<string, string> = {
  associate: "Associate degree in",
  bachelor: "BSc",
  master: "MSc",
  doctorate: "PhD in",
  other: "Diploma in",
};

/** "bachelor" + "Computer Science" → "BSc Computer Science". */
export function formatDegree(degree: string, field: string): string {
  return `${DEGREE_LABELS[degree] ?? DEGREE_LABELS.other} ${field}`;
}

/** Notice period in days as the CV states it. */
export function formatAvailability(days: number): string {
  return days === 0 ? "Available immediately" : `Notice period: ${days} days`;
}

const WORK_MODE_LABELS: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
  relocation: "Open to relocation",
};

export function formatWorkModes(modes: readonly string[]): string {
  return modes.map((m) => WORK_MODE_LABELS[m] ?? m).join(" · ");
}
