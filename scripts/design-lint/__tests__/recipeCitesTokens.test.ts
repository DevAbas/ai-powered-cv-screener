import { recipeCitesTokens } from "../rules/recipeCitesTokens.mjs";
import { COMPONENT, RECIPE, ruleTester } from "./ruleTester";

ruleTester.run("design/recipe-cites-tokens", recipeCitesTokens, {
  valid: [
    { filename: RECIPE, code: 'import { defineRecipe } from "@/components/ui/recipe";\n\n// DESIGN.md, Buttons. Tokens: `button-primary`, `button-primary-hover`.\nexport const r = defineRecipe({ base: "rounded-full" });' },
    // A colour role, a text style and prose with hyphens and code that are not names.
    { filename: RECIPE, code: "// DESIGN.md, Layout (motion): the empty-state grid. Token: `primary`, in `label-lg`; pressed is the native `:active` state, as `inputRecipe` does.\nexport const r = 1;" },
    // Not a recipe file.
    { filename: COMPONENT, code: "export const r = 1;" },
  ],
  invalid: [
    { filename: RECIPE, code: "export const r = 1;", errors: [{ messageId: "noComment" }] },
    { filename: RECIPE, code: "// Styles for the button, see the design.\nexport const r = 1;", errors: [{ messageId: "noComment" }] },
    { filename: RECIPE, code: "// DESIGN.md, Buttons: the primary action.\nexport const r = 1;", errors: [{ messageId: "noTokens" }] },
    { filename: RECIPE, code: "// DESIGN.md, Inputs. Tokens: `input`, `multi-line`.\nexport const r = 1;", errors: [{ messageId: "unknownToken", data: { name: "multi-line" } }] },
  ],
});
