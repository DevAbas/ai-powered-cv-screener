// PreToolUse, Bash: a `git commit` runs the strict lint, the typecheck and
// the design system's checks (every output matches design-system/tokens/ and DESIGN.md;
// DESIGN.md lints clean in both themes) first, and is refused when any fails
// (AGENTS.md, Always). Any other command passes at once.

import { block, hookInput, run } from "./hookInput.mjs";

/** `git commit` as a command: at the start, or after `;`, `&&`, `||` or a pipe; not the words inside a heredoc or a message. */
const GIT_COMMIT = /(^|[;&|]\s*)git\s+commit\b/m;

const command = hookInput().tool_input?.command;
if (typeof command !== "string" || !GIT_COMMIT.test(command)) process.exit(0);

const lint = run("npm", ["run", "-s", "lint:strict"]);
if (lint.status !== 0) block(`Commit refused: lint:strict failed.\n${lint.output}`);
const types = run("npm", ["run", "-s", "typecheck"]);
if (types.status !== 0) block(`Commit refused: typecheck failed.\n${types.output}`);
const outputs = run("npm", ["run", "-s", "design:export", "--", "--check"]);
if (outputs.status !== 0) block(`Commit refused: the design outputs do not match design-system/tokens/.\n${outputs.output}`);
const design = run("npm", ["run", "-s", "design:lint"]);
if (design.status !== 0) block(`Commit refused: design:lint failed.\n${design.output}`);
process.exit(0);
