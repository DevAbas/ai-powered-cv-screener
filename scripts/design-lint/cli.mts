// Lints DESIGN.md in both themes.
//
//   npm run design:lint
//
// Checks the tokens' tiers (scripts/design-tokens/tokenSource.ts) and
// DESIGN.md's components contract, then runs the @google/design.md linter on
// DESIGN.md composed with each theme's values from the tokens (in memory:
// DESIGN.md holds no values), for references and contrast. Exits non-zero on
// any error or warning the design system does not mean.

import { readFileSync } from "node:fs";
import { lint } from "@google/design.md/linter";
import { contractProblems, lintDocument } from "../design-tokens/designDocument";
import { readTokenSource, RESOLVER_PATH, TokenSourceError } from "../design-tokens/tokenSource";
import type { Issue, LintFinding } from "./core";
import { isExpected } from "./core";

const designMd = readFileSync("DESIGN.md", "utf8");
const issues: (Issue & { theme: string })[] = [];
const report = (theme: string, findings: readonly LintFinding[], palette: ReadonlySet<string>) => {
  for (const f of findings) {
    // isExpected already passes info findings; the severity test is here for TypeScript, which narrows it to an Issue's.
    if (!isExpected(f, palette) && f.severity !== "info") issues.push({ theme, severity: f.severity, message: `${f.path ? `${f.path}: ` : ""}${f.message}` });
  }
};

let summary = "";
try {
  const source = await readTokenSource();
  for (const problem of contractProblems(designMd, source, RESOLVER_PATH)) issues.push({ theme: "contract", severity: "error", message: problem });
  const palette = new Set(source.palette.keys());
  report("light", lint(lintDocument(designMd, source, "light")).findings, palette);
  // Structural rules are theme-independent; only contrast differs in dark.
  report(
    "dark",
    lint(lintDocument(designMd, source, "dark")).findings.filter((f) => f.rule === "contrast-ratio"),
    palette,
  );
  summary = `${source.roles.light.size} colour roles in each theme, ${source.palette.size} palette entries`;
} catch (error) {
  if (!(error instanceof TokenSourceError)) throw error;
  for (const problem of error.problems) issues.push({ theme: "tiers", severity: "error", message: problem });
}

for (const issue of issues) console.log(`${issue.severity.padEnd(7)} [${issue.theme}] ${issue.message}`);
const errors = issues.filter((i) => i.severity === "error").length;
console.log(`design:lint: ${errors} errors, ${issues.length - errors} warnings${summary ? ` (${summary})` : ""}`);
process.exit(issues.length > 0 ? 1 : 0);
