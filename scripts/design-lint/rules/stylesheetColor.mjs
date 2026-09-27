/**
 * design/stylesheet-color
 *
 * The hand-written stylesheets (src/app/globals.css, src/styles/*.css but the
 * generated ones) are held to the same line as component source: every colour
 * traces to a role (DESIGN.md, Do's and Don'ts). A raw colour means what it
 * means to design/no-raw-color, whose `hasRawColor` this rule calls: a hex
 * value, or a colour function with a literal digit in its arguments. And the
 * palette is never read outside the roles (DESIGN.md, Overview), as
 * design/token-classes holds a class to (`PALETTE_VARIABLE`).
 *
 * Bad
 *   color: #202020;
 *   border-color: color-mix(in oklab, var(--color-primary) 40%, transparent);
 *   background-color: var(--palette-mint-9);
 *
 * Good
 *   background-color: var(--color-surface);
 *   scrollbar-color: var(--color-outline) transparent;
 *
 * Scope: CSS files, through @eslint/css in tolerant mode, since Tailwind's and
 * Terrazzo's at-rules (`@theme`, `@tz (…)`, nesting) are not standard CSS.
 * What the parser cannot read as a declaration it keeps as a Raw node, so the
 * rule reads every declaration's value and every Raw node outside one; nothing
 * in the file is left unread. Comments are removed first, as in component
 * source. A derived colour belongs in design-system/tokens/, with its rule
 * (DESIGN.md, Colors), not in a stylesheet.
 *
 * Known limitations: a hex-like ID selector (`#bad`) in recovered Raw text is
 * reported as a colour; named colours (`red`) are not flagged.
 */

import { hasRawColor } from "./noRawColor.mjs";
import { PALETTE_VARIABLE } from "./tokenClasses.mjs";

const COMMENT = /\/\*[\s\S]*?\*\//g;

/** What is wrong with a stretch of stylesheet text: the message ids, in report order. */
export function stylesheetColorProblems(text) {
  const code = text.replace(COMMENT, " ");
  return [...(hasRawColor(code) ? ["rawColor"] : []), ...(PALETTE_VARIABLE.test(code) ? ["paletteVariable"] : [])];
}

/** @type {import("eslint").Rule.RuleModule} */
export const stylesheetColor = {
  meta: {
    type: "problem",
    languages: ["css/css"],
    docs: { description: "Disallow raw colours and palette variables in stylesheets: every colour traces to a role" },
    messages: {
      rawColor:
        "Raw colour in a stylesheet: no token holds it and the dark theme cannot change it. Use a colour role (`var(--color-surface)`); a new colour goes into design-system/tokens/ (the palette, then a role in each theme) with its rule in DESIGN.md, then `npm run design:export`.",
      paletteVariable: "A palette variable in a stylesheet. Stylesheets read roles, never primitives (DESIGN.md, Overview): use the role that points to it (`var(--color-…)`).",
    },
    schema: [],
  },
  create(context) {
    const check = (node, text) => {
      for (const messageId of stylesheetColorProblems(text)) context.report({ node, messageId });
    };
    return {
      Declaration(node) {
        check(node, `${node.property}: ${context.sourceCode.getText(node.value)}`);
      },
      ":not(Declaration) > Raw"(node) {
        check(node, context.sourceCode.getText(node));
      },
    };
  },
};
