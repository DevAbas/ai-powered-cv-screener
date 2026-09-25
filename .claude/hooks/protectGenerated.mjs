// PreToolUse, Edit|Write: the generated token file is never edited by hand
// (AGENTS.md, Never). The edit is denied with the reason, through the JSON
// decision the hooks reference documents for PreToolUse.

import { editedFile, hookInput } from "./hookInput.mjs";

const GENERATED = "src/styles/tokens.generated.css";

if (editedFile(hookInput()) === GENERATED) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `${GENERATED} is generated from DESIGN.md. Change DESIGN.md (and theme.css for a dark value), then run \`npm run design:export\` (AGENTS.md, Never).`,
      },
    }),
  );
}
process.exit(0);
