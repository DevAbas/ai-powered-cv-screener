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
 */

import { loadDesignTokens } from "../designTokens.mjs";

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
    },
    schema: [],
  },
  create(context) {
    if (!RECIPE_FILE.test(context.filename)) return {};
    const tokens = loadDesignTokens(context.cwd);
    return {
      Program(program) {
        const first = program.body.find((statement) => statement.type !== "ImportDeclaration");
        if (!first) return;
        const opening = context.sourceCode.getAllComments().filter((comment) => comment.range[1] <= first.range[0]);
        const text = opening.map((comment) => comment.value).join("\n");
        if (!text.includes("DESIGN.md")) {
          context.report({ node: first, messageId: "noComment" });
          return;
        }
        const cited = [...text.matchAll(CITED)].map(([, name]) => name);
        for (const name of cited) {
          if (!tokens.names.has(name)) context.report({ node: opening[0], messageId: "unknownToken", data: { name } });
        }
        if (!cited.some((name) => tokens.names.has(name))) context.report({ node: opening[0], messageId: "noTokens" });
      },
    };
  },
};
