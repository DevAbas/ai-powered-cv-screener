// PreToolUse, Edit|Write: the stylesheets Terrazzo builds from the design
// tokens are never edited by hand (AGENTS.md, Never). The edit is denied with
// the reason, through the JSON decision the hooks reference documents for
// PreToolUse. DESIGN.md is not generated: it holds the rules and no values,
// and a value written into it fails the export's contract check, which
// lintEditedFile.mjs runs after the edit.

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
