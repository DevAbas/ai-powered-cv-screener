// PostToolUse, Edit|Write: the file just written is linted at once, with the
// design rules as errors, so a class outside DESIGN.md comes back to the agent
// as the next thing it reads instead of at commit time (AGENTS.md, Harness).
// A change to DESIGN.md or theme.css runs the document lint and checks that
// the exported tokens are current.

import { readFileSync } from "node:fs";
import { block, editedFile, hookInput, run } from "./hookInput.mjs";

const LINTED = /^(src\/.*\.(ts|tsx)|\.storybook\/.*\.tsx)$/;
const DESIGN_SOURCES = new Set(["DESIGN.md", "src/styles/theme.css"]);
const GENERATED = "src/styles/tokens.generated.css";

const file = editedFile(hookInput());
if (file === undefined) process.exit(0);

if (LINTED.test(file)) {
  const lint = run("eslint", ["--no-warn-ignored", "--cache", "--cache-location", "node_modules/.cache/eslint", file], { DESIGN_LINT_STRICT: "1" });
  if (lint.status !== 0) block(`Lint failed for ${file} (design rules as errors, AGENTS.md):\n${lint.output}`);
  process.exit(0);
}

if (DESIGN_SOURCES.has(file)) {
  const lint = run("npm", ["run", "-s", "design:lint"]);
  if (lint.status !== 0) block(`design:lint failed after editing ${file}:\n${lint.output}`);
  if (file === "DESIGN.md") {
    const exported = run("design.md", ["export", "--format", "css-tailwind", "DESIGN.md"]);
    if (exported.status !== 0) block(`Exporting DESIGN.md failed:\n${exported.output}`);
    if (exported.output !== readFileSync(GENERATED, "utf8")) block(`DESIGN.md changed its tokens but ${GENERATED} is stale. Run \`npm run design:export\` (never edit the generated file).`);
  }
}
process.exit(0);
