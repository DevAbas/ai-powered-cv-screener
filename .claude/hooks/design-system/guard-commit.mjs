// PreToolUse, Bash: an agent's `git commit` runs the core's `before-commit`
// stage first (the `beforeCommit` commands of design-system/gates.json), and
// is refused when any fails. Any other command passes at once. A person's
// commit runs the same stage through the git pre-commit hook.

import { STAGES, isGitCommit, readGates } from "../../../design-system/harness/gates.mjs";
import { hookInput, report, shellCommand } from "./hook-io.mjs";

if (!isGitCommit(shellCommand(hookInput()))) report(undefined);
const problem = STAGES["before-commit"](readGates(), []);
report(problem && `Commit refused: ${problem}`);
