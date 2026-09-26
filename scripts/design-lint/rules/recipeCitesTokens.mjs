/**
 * design/recipe-cites-tokens
 *
 * Every recipe opens with a comment naming the DESIGN.md component tokens it
 * implements (src/components/README.md, Styles are recipes): that comment is
 * how a reviewer checks the recipe against the design without reading every
 * class. A name that is not in DESIGN.md makes the comment a lie, and a recipe
 * without the comment cannot be checked at all. This rule reads the
 * `components:` keys and the colour roles from DESIGN.md's front matter and
 * holds the comment to them.
 *
 * Bad
 *   // Styles for the button.
 *   export const buttonRecipe = defineRecipe({ … });
 *
 * Good
 *   // DESIGN.md, Buttons and Icons. Tokens: button-primary, button-primary-hover,
 *   // button-primary-pressed, button-secondary, button-disabled.
 *   export const buttonRecipe = defineRecipe({ … });
 *
 * Scope: `*.recipe.ts` files; the comments before the first statement that is
 * not an import. The comment must mention `DESIGN.md` and cite at least one
 * token in backticks; every backticked lowercase name must be one DESIGN.md's
 * front matter defines (a component token, a colour role, a text style, a
 * radius), so prose stays free and names stay real.
 *
 * A cited component token is also held to its values: DESIGN.md names the
 * roles the component reads (`button-primary`: background `primary`, text
 * `on-primary`, type `label-md`, radius `full`), and the recipe must use each
 * as a class (`bg-primary`, `text-on-primary`, `text-label-md`,
 * `rounded-full`), under any variant. So a token that changes in DESIGN.md
 * fails the recipe that still styles the old way, and the comment cannot
 * drift from the code.
 */

import { loadDesignTokens } from "../designTokens.mjs";
import { classGroupCollector, classesOf, piecesOf } from "../classLists.mjs";

/** The class a component token's property expects, from the reference DESIGN.md gives it. */
const EXPECTED_CLASS = {
  backgroundColor: (name) => `bg-${name}`,
  textColor: (name) => `text-${name}`,
  typography: (name) => `text-${name}`,
  rounded: (name) => `rounded-${name}`,
};

const RECIPE_FILE = /\.recipe\.ts$/;
/** A name in backticks, as the comments cite tokens; `:active` and `inputRecipe` are not names. */
const CITED = /`([a-z][a-z0-9]*(?:-[a-z0-9]+)*)`/g;

/** @type {import("eslint").Rule.RuleModule} */
export const recipeCitesTokens = {
  meta: {
    type: "problem",
    docs: { description: "A recipe opens with a comment naming the DESIGN.md tokens it implements, and the names exist" },
    messages: {
      noComment: "A recipe opens with a comment naming the DESIGN.md tokens it implements (src/components/README.md, Styles are recipes).",
      noTokens: "The opening comment cites no DESIGN.md token. Name the tokens this recipe implements in backticks, as DESIGN.md's front matter spells them (`button-primary`).",
      unknownToken: "`{{name}}` is not a token in DESIGN.md's front matter. Use the name DESIGN.md spells, or add the token there first.",
      drift: "DESIGN.md's `{{component}}` sets {{property}} to `{{value}}`, but no class in this recipe is `{{expected}}`. Style the component with the token's role, or change the token in DESIGN.md first.",
    },
    schema: [],
  },
  create(context) {
    if (!RECIPE_FILE.test(context.filename)) return {};
    const tokens = loadDesignTokens(context.cwd);
    const collector = classGroupCollector(context);
    /** The components the opening comment cites, and where to report them. */
    let cited = [];
    let citation;
    return {
      ...collector.visitors(),
      "Program:exit"() {
        if (!citation) return;
        const bases = new Set();
        for (const group of collector.groups()) {
          for (const node of group.nodes) {
            for (const piece of piecesOf(node, context.sourceCode)) for (const { parsed } of classesOf(piece.text)) bases.add(parsed.base);
          }
        }
        for (const component of cited) {
          for (const [property, reference] of tokens.components.get(component) ?? []) {
            const expected = EXPECTED_CLASS[property]?.(reference.split(".")[1]);
            if (expected && !bases.has(expected)) {
              context.report({ node: citation, messageId: "drift", data: { component, property, value: reference.split(".")[1], expected } });
            }
          }
        }
      },
      Program(program) {
        const first = program.body.find((statement) => statement.type !== "ImportDeclaration");
        if (!first) return;
        const opening = context.sourceCode.getAllComments().filter((comment) => comment.range[1] <= first.range[0]);
        const text = opening.map((comment) => comment.value).join("\n");
        if (!text.includes("DESIGN.md")) {
          context.report({ node: first, messageId: "noComment" });
          return;
        }
        const names = [...text.matchAll(CITED)].map(([, name]) => name);
        for (const name of names) {
          if (!tokens.names.has(name)) context.report({ node: opening[0], messageId: "unknownToken", data: { name } });
        }
        if (!names.some((name) => tokens.names.has(name))) context.report({ node: opening[0], messageId: "noTokens" });
        cited = names.filter((name) => tokens.components.has(name));
        citation = opening[0];
      },
    };
  },
};
