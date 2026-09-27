// PostToolUse, Edit|Write: the file just written is linted at once, with the
// design rules as errors, so a class outside the design tokens comes back to
// the agent as the next thing it reads instead of at commit time (AGENTS.md,
// Harness). A change to the design system's sources (tokens/, DESIGN.md, the
// Tailwind template, the Terrazzo config) checks that every output matches
// them and lints DESIGN.md in both themes.

import { block, editedFile, hookInput, run } from "./hookInput.mjs";

const LINTED = /^(src\/.*\.(ts|tsx)|\.storybook\/.*\.tsx)$/;
const DESIGN_SOURCES = /^(tokens\/.*\.json|DESIGN\.md|src\/styles\/theme\.template\.css|terrazzo\.config\.ts)$/;

const file = editedFile(hookInput());
if (file === undefined) process.exit(0);

if (LINTED.test(file)) {
  const lint = run("eslint", ["--no-warn-ignored", "--cache", "--cache-location", "node_modules/.cache/eslint", file], { DESIGN_LINT_STRICT: "1" });
  if (lint.status !== 0) block(`Lint failed for ${file} (design rules as errors, AGENTS.md):\n${lint.output}`);
  process.exit(0);
}

if (DESIGN_SOURCES.test(file)) {
  const current = run("npm", ["run", "-s", "design:export", "--", "--check"]);
  if (current.status !== 0) block(`The design outputs no longer match their sources after editing ${file}:\n${current.output}\nValues live in tokens/; run \`npm run design:export\` (never write a value into DESIGN.md, or edit the generated CSS by hand).`);
  const lint = run("npm", ["run", "-s", "design:lint"]);
  if (lint.status !== 0) block(`design:lint failed after editing ${file}:\n${lint.output}`);
}
process.exit(0);
