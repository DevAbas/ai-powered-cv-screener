/**
 * design/focus-visible-only
 *
 * A focus ring is a keyboard affordance. `focus:` and `focus-within:` also
 * match a mouse click, so a ring written against them appears for pointer
 * users who never asked for it, and on the paths a review misses: a menu that
 * returns focus to its trigger after a click, a button pressed and released.
 * `focus-visible:` asks the browser which kind of focus it is, and a text
 * input still matches it when clicked, so nothing is lost. DESIGN.md (Inputs)
 * specifies the ring on keyboard focus; src/components/README.md (Behaviour
 * and state) says `focus-visible:`, never `focus:`.
 *
 * Bad
 *   className="focus:ring-2 focus:ring-primary-outline"
 *   className="focus-within:border-primary-outline"
 *
 * Good
 *   className={focusVisibleRing}                                   // src/components/ui/recipe.ts
 *   className="has-[textarea:focus-visible]:ring-2"                // a ring on a wrapper
 *   className="focus:outline-none"                                 // suppressing is fine
 *
 * Scope: classes whose base draws a ring, outline, border or shadow under a
 * pointer-focus variant (`focus`, `focus-within`, `group-focus`, `peer-focus`,
 * or an arbitrary variant containing `:focus` but not `:focus-visible`).
 * Values that take a ring away (`outline-none`, `ring-0`, `shadow-none`,
 * `border-transparent`) are not flagged. Autofix rewrites an exact `focus:`
 * variant to `focus-visible:`; the other forms are reported without a fix,
 * because the right wrapper selector is a design choice.
 */

import { classGroupCollector, classesOf, piecesOf } from "../classLists.mjs";

const POINTER_FOCUS = new Set(["focus", "focus-within", "group-focus", "peer-focus", "group-focus-within", "peer-focus-within"]);
const DRAWS = /^(ring|outline|border|shadow)(-|$)/;
const SUPPRESSES = /^(outline-(none|hidden|0)|ring-(0|transparent)|shadow-none|border-(0|transparent|none))$/;

function isPointerFocus(variant) {
  if (POINTER_FOCUS.has(variant)) return true;
  return variant.includes("[") && /:focus(-within)?(?![-\w])/.test(variant.replace(/:not\([^)]*\)/g, "")) && !variant.includes("focus-visible");
}

/** @type {import("eslint").Rule.RuleModule} */
export const focusVisibleOnly = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: { description: "Focus styling keys off focus-visible, never focus or focus-within" },
    messages: {
      pointerFocus: "`{{class}}` draws focus for a mouse click too: `{{variant}}:` matches pointer focus. Use `focus-visible:` (DESIGN.md, Inputs), like `focusVisibleRing` in src/components/ui/recipe.ts.",
    },
    schema: [],
  },
  create(context) {
    const collector = classGroupCollector(context);
    return {
      ...collector.visitors(),
      "Program:exit"() {
        for (const group of collector.groups()) {
          for (const node of group.nodes) {
            for (const piece of piecesOf(node, context.sourceCode)) {
              for (const { parsed, start, end } of classesOf(piece.text)) {
                if (!DRAWS.test(parsed.base) || SUPPRESSES.test(parsed.base)) continue;
                const variant = parsed.variants.find(isPointerFocus);
                if (variant === undefined) continue;
                context.report({
                  node,
                  messageId: "pointerFocus",
                  data: { class: parsed.raw, variant },
                  fix: variant === "focus" ? (fixer) => piece.replace(fixer, start, end, parsed.raw.replace(/(^|:)focus:/, "$1focus-visible:")) : null,
                });
              }
            }
          }
        }
      },
    };
  },
};
