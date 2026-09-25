/**
 * design/no-raw-color
 *
 * A raw colour in component source (a hex value, `rgb()`, `hsl()`, `oklch()`,
 * `color-mix()` with literal channels, …) is a colour DESIGN.md does not know
 * and the dark theme cannot reach: it is the same colour in both themes and
 * nobody sees it in the design system. DESIGN.md says every colour on screen
 * traces to a token (Do's and Don'ts), and theme.css gives each role its dark
 * value, so the only place for a new colour is DESIGN.md, then theme.css, then
 * `npm run design:export`.
 *
 * Bad
 *   const TINT = "#6b7280";
 *   style={{ boxShadow: "0 1px 2px rgba(0, 0, 0, 0.12)" }}
 *
 * Good
 *   className="bg-surface-container shadow-soft"
 *   ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`   // channels read from a token
 *
 * Scope: string and template literals in `src`. A colour function counts only
 * when its arguments carry a literal digit: `rgba(${r}, ${g}, ${b}, ${a})`
 * builds a colour from values it was handed (CursorGrid reads them from the
 * `primary` token) and chooses none. Comments are not literals, so a token
 * value quoted in a comment is fine. Test files are exempt: a test asserts on
 * colours.
 *
 * Known limitations: named CSS colours (`red`) are indistinguishable from
 * other words and are not flagged; a colour assembled at runtime from parts
 * (`"#" + hex`) is not flagged.
 */

const HEX = /(?<![\w#])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w#])/;
const COLOR_FUNCTION = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/gi;
const TEST_FILE = /(^|[\\/])__tests__[\\/]|\.test\.[cm]?tsx?$/;

/** The index of the `)` closing the call whose arguments start at `from`, or -1. */
function endOfCall(text, from) {
  let depth = 1;
  for (let i = from; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** True when `text` holds a hex colour, or a colour function with a literal digit in its arguments. */
export function hasRawColor(text) {
  if (HEX.test(text)) return true;
  COLOR_FUNCTION.lastIndex = 0;
  let match;
  while ((match = COLOR_FUNCTION.exec(text)) !== null) {
    const argsStart = match.index + match[0].length;
    const argsEnd = endOfCall(text, argsStart);
    if (argsEnd !== -1 && /\d/.test(text.slice(argsStart, argsEnd))) return true;
  }
  return false;
}

/** Stands in for each `${…}` of a template, so a channel read from a variable is never a literal digit. */
const HOLE = "\u0000";

/** @type {import("eslint").Rule.RuleModule} */
export const noRawColor = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw colour values in component source: every colour traces to a DESIGN.md token" },
    messages: {
      rawColor:
        "Raw colour in component source: DESIGN.md does not know it and the dark theme cannot change it. Use a colour role (`bg-surface-container`, `text-on-surface`, `var(--color-primary)`); a new colour goes into DESIGN.md and theme.css first, then `npm run design:export`.",
    },
    schema: [],
  },
  create(context) {
    if (TEST_FILE.test(context.filename)) return {};
    return {
      Literal(node) {
        if (typeof node.value === "string" && hasRawColor(node.value)) context.report({ node, messageId: "rawColor" });
      },
      TemplateLiteral(node) {
        if (hasRawColor(node.quasis.map((quasi) => quasi.value.raw).join(HOLE))) context.report({ node, messageId: "rawColor" });
      },
    };
  },
};
