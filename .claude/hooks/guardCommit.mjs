// PreToolUse, Bash: a `git commit` runs the strict lint and the typecheck
// first, and is refused when either fails (AGENTS.md, Always: lint and
// typecheck before committing). Any other command passes at once.

import { block, hookInput, run } from "./hookInput.mjs";

/** `git commit` as a command: at the start, or after `;`, `&&`, `||` or a pipe; not the words inside a heredoc or a message. */
const GIT_COMMIT = /(^|[;&|]\s*)git\s+commit\b/m;

const command = hookInput().tool_input?.command;
if (typeof command !== "string" || !GIT_COMMIT.test(command)) process.exit(0);

const lint = run("npm", ["run", "-s", "lint:strict"]);
if (lint.status !== 0) block(`Commit refused: lint:strict failed.\n${lint.output}`);
const types = run("npm", ["run", "-s", "typecheck"]);
if (types.status !== 0) block(`Commit refused: typecheck failed.\n${types.output}`);
process.exit(0);
