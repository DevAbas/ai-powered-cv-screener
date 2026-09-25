/**
 * design/no-hover-on-disabled
 *
 * A disabled control that lights up under the pointer promises a click it
 * will not honour. Browsers suppress a disabled control's events, not its
 * `:hover` styling, so `hover:bg-…` on a button that can be disabled paints
 * the hover on the disabled state too. DESIGN.md (Buttons) says the disabled
 * state is carried by the neutral fill and the absence of hover;
 * src/components/README.md (Behaviour and state) says `enabled:hover:` on a
 * control that can be disabled.
 *
 * Bad
 *   <button className="hover:bg-surface-container-high disabled:text-on-surface-variant">
 *
 * Good
 *   <button className="enabled:hover:bg-surface-container-high disabled:text-on-surface-variant">
 *   <a className="hover:text-primary-text">                     // a link has no disabled state
 *
 * Scope: a class group (one `className`, one `cx` call, one recipe value)
 * that either styles a form control (`button`, `input`, `textarea`, `select`,
 * `Button`, `IconButton`, `Textarea`) or carries a `disabled:` utility. In
 * such a group every `hover:` and `active:` variant must be preceded by
 * `enabled:`. `group-hover:` and `peer-hover:` are different variants and are
 * not flagged. Autofix inserts `enabled:`.
 *
 * Known limitation: a list that reaches the element through a function call
 * (`className={cardClass(active, compact)}`) is not followed.
 */

import { classGroupCollector, classesOf, piecesOf } from "../classLists.mjs";

const CONTROLS = new Set(["button", "input", "textarea", "select", "Button", "IconButton", "Textarea"]);
const POINTER = new Set(["hover", "active"]);

/** @type {import("eslint").Rule.RuleModule} */
export const noHoverOnDisabled = {
  meta: {
    type: "problem",
    fixable: "code",
    docs: { description: "hover and active on a control that can be disabled are enabled:hover and enabled:active" },
    messages: {
      hoverOnDisabled: "`{{class}}` lights up a disabled control: `:{{variant}}` matches a disabled element. Write `enabled:{{variant}}:` (DESIGN.md, Buttons; src/components/README.md, Behaviour and state).",
    },
    schema: [],
  },
  create(context) {
    const collector = classGroupCollector(context);
    return {
      ...collector.visitors(),
      "Program:exit"() {
        for (const group of collector.groups()) {
          const occurrences = group.nodes.flatMap((node) => piecesOf(node, context.sourceCode).flatMap((piece) => classesOf(piece.text).map((entry) => ({ node, piece, ...entry }))));
          const canBeDisabled = (group.element !== undefined && CONTROLS.has(group.element)) || occurrences.some(({ parsed }) => parsed.variants.includes("disabled"));
          if (!canBeDisabled) continue;
          for (const { node, piece, parsed, start, end } of occurrences) {
            const variant = parsed.variants.find((candidate) => POINTER.has(candidate));
            if (variant === undefined || parsed.variants.includes("enabled")) continue;
            context.report({
              node,
              messageId: "hoverOnDisabled",
              data: { class: parsed.raw, variant },
              fix: (fixer) => piece.replace(fixer, start, end, parsed.raw.replace(/(^|:)(hover|active):/, "$1enabled:$2:")),
            });
          }
        }
      },
    };
  },
};
