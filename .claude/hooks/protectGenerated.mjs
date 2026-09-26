// PreToolUse, Edit|Write: the stylesheets Terrazzo builds from the design
// tokens are never edited by hand (AGENTS.md, Never). The edit is denied with
// the reason, through the JSON decision the hooks reference documents for
// PreToolUse. DESIGN.md's token groups are generated too, but they share the
// file with the hand-written rules; lintEditedFile.mjs catches an edit there.

import { editedFile, hookInput } from "./hookInput.mjs";

const GENERATED = new Set(["src/styles/tokens.generated.css", "src/styles/theme.generated.css"]);

const file = editedFile(hookInput());
if (file !== undefined && GENERATED.has(file)) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `${file} is built from the design tokens. Change the values in tokens/ (or the wiring in src/styles/theme.template.css), then run \`npm run design:export\` (AGENTS.md, Never).`,
      },
    }),
  );
}
process.exit(0);
