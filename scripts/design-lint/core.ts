// Pure helpers for `npm run design:lint`: which of the design.md linter's
// findings the design system means, and so are not problems.

export interface Issue {
  severity: "error" | "warning";
  message: string;
}

/** A finding as `@google/design.md/linter` reports it. */
export interface LintFinding {
  severity: "error" | "warning" | "info";
  path?: string | undefined;
  rule?: string | undefined;
  message: string;
}

/**
 * True for a finding the design system means: a palette entry no component
 * reads directly (roles read the palette; components read roles). Info
 * findings are summaries, not problems.
 */
export function isExpected(finding: LintFinding, palette: ReadonlySet<string>): boolean {
  if (finding.severity === "info") return true;
  if (finding.rule === "orphaned-tokens" && finding.path?.startsWith("colors.")) return palette.has(finding.path.slice("colors.".length));
  return false;
}
