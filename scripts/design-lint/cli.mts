// Lints DESIGN.md in both themes.
//
//   npm run design:lint
//
// Runs the @google/design.md linter on DESIGN.md (light), checks that
// src/styles/theme.css gives every colour role a dark value, then lints
// DESIGN.md again with the dark values substituted (dark). Exits non-zero on
// any error or warning.

import { readFileSync } from "node:fs";
import { lint } from "@google/design.md/linter";
import type { Finding } from "@google/design.md/linter";
import type { Issue } from "./core";
import { checkCoverage, parseDarkColors, withDarkColors } from "./core";

const designMd = readFileSync("DESIGN.md", "utf8");
const themeCss = readFileSync("src/styles/theme.css", "utf8");

const light = lint(designMd);
const dark = parseDarkColors(themeCss);
const coverage = checkCoverage([...light.designSystem.colors.keys()], dark);
const darkReport = lint(withDarkColors(designMd, dark));

const reported = (theme: string, findings: Finding[]): (Issue & { theme: string })[] =>
  findings.flatMap((f) =>
    f.severity === "info" ? [] : [{ theme, severity: f.severity, message: `${f.path ? `${f.path}: ` : ""}${f.message}` }],
  );

const issues = [
  ...reported("light", light.findings),
  ...coverage.map((issue) => ({ ...issue, theme: "dark" })),
  // Structural rules are theme-independent; only contrast differs in dark.
  ...reported(
    "dark",
    darkReport.findings.filter((f) => f.rule === "contrast-ratio"),
  ),
];

for (const issue of issues) console.log(`${issue.severity.padEnd(7)} [${issue.theme}] ${issue.message}`);
const errors = issues.filter((i) => i.severity === "error").length;
const warnings = issues.length - errors;
console.log(`design:lint: ${errors} errors, ${warnings} warnings (${light.designSystem.colors.size} colour roles, ${dark.size} dark values)`);
process.exit(issues.length > 0 ? 1 : 0);
