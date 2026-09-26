// Builds the design system's outputs from its two sources of truth.
//
//   npm run design:export              check the sources, then build the CSS
//   npm run design:export -- --check   exit 1 when the CSS differs from what the tokens give
//
// tokens/ (W3C Design Tokens, read through tokens/design.resolver.json) is the
// source of truth for every value; DESIGN.md is the source of truth for the
// rules, including which roles each component reads, and holds no values.
// This checks the tokens' tiers and DESIGN.md's components contract against
// them, then runs Terrazzo (terrazzo.config.ts), which builds
// src/styles/tokens.generated.css and theme.generated.css from the tokens.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contractProblems } from "./designDocument";
import { readTokenSource, RESOLVER_PATH, TokenSourceError } from "./tokenSource";

const DESIGN = "DESIGN.md";
const CSS_DIRECTORY = "src/styles";
const CSS_OUTPUTS = ["tokens.generated.css", "theme.generated.css"];

const check = process.argv.includes("--check");
const stale: string[] = [];

let source;
try {
  source = await readTokenSource();
} catch (error) {
  if (!(error instanceof TokenSourceError)) throw error;
  console.error(error.message);
  process.exit(1);
}

const contract = contractProblems(readFileSync(DESIGN, "utf8"), source, RESOLVER_PATH);
if (contract.length > 0) {
  console.error(`DESIGN.md breaks the rules of the rules document:\n${contract.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}

/** Runs Terrazzo into `outDir`; exits with its output when the build fails. */
function buildCss(outDir?: string) {
  const result = spawnSync("tz", ["build", "--silent"], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${join(process.cwd(), "node_modules/.bin")}:${process.env.PATH ?? ""}`, ...(outDir ? { DESIGN_TOKENS_OUT_DIR: outDir } : {}) },
  });
  if (result.status !== 0) {
    console.error(`Terrazzo failed:\n${result.stdout}${result.stderr}`);
    process.exit(1);
  }
}

if (!check) {
  buildCss();
  for (const file of CSS_OUTPUTS) console.log(`built ${CSS_DIRECTORY}/${file}`);
} else {
  const outDir = mkdtempSync(join(tmpdir(), "design-tokens-"));
  buildCss(`${outDir}/`);
  // Terrazzo's header names the template relative to the output folder, which differs for the temporary build.
  const comparable = (css: string) => css.replace(/^ \*  template: .*$/m, "");
  for (const file of CSS_OUTPUTS) {
    const path = `${CSS_DIRECTORY}/${file}`;
    if (!existsSync(path) || comparable(readFileSync(path, "utf8")) !== comparable(readFileSync(join(outDir, file), "utf8"))) stale.push(path);
  }
  rmSync(outDir, { recursive: true, force: true });
  if (stale.length > 0) {
    console.error(`Out of date: ${stale.join(", ")}. The values live in tokens/: edit them there and run \`npm run design:export\` (never edit the outputs by hand).`);
    process.exit(1);
  }
  console.log(`design:export --check: the tokens and DESIGN.md's contract hold; ${CSS_OUTPUTS.length} stylesheets match tokens/`);
}
