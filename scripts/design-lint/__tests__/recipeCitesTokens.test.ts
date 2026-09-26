import { recipeCitesTokens } from "../rules/recipeCitesTokens.mjs";
import { COMPONENT, RECIPE, ruleTester } from "./ruleTester";

ruleTester.run("design/recipe-cites-tokens", recipeCitesTokens, {
  valid: [
    // The recipe uses every role its cited tokens name, under any variant.
    {
      filename: RECIPE,
      code: 'import { defineRecipe } from "@/components/ui/recipe";\n\n// DESIGN.md, Buttons. Tokens: `button-primary`, `button-primary-hover`.\nexport const r = defineRecipe({ base: "rounded-full text-label-md", variants: { variant: { primary: "bg-primary text-on-primary enabled:hover:bg-primary-hover" } } });',
    },
    // A colour role, a text style and prose with hyphens and code that are not names.
    { filename: RECIPE, code: "// DESIGN.md, Layout (motion): the empty-state grid. Token: `primary`, in `label-lg`; pressed is the native `:active` state, as `inputRecipe` does.\nexport const r = 1;" },
    // Not a recipe file.
    { filename: COMPONENT, code: "export const r = 1;" },
  ],
  invalid: [
    { filename: RECIPE, code: "export const r = 1;", errors: [{ messageId: "noComment" }] },
    { filename: RECIPE, code: "// Styles for the button, see the design.\nexport const r = 1;", errors: [{ messageId: "noComment" }] },
    { filename: RECIPE, code: "// DESIGN.md, Buttons: the primary action.\nexport const r = 1;", errors: [{ messageId: "noTokens" }] },
    { filename: RECIPE, code: "// DESIGN.md, Inputs. Tokens: `input-placeholder`, `multi-line`.\nexport const r = defineRecipe({ base: \"placeholder:text-outline-variant\" });", errors: [{ messageId: "unknownToken", data: { name: "multi-line" } }] },
    // The token says `link` is `body-md`; a recipe that never sets it has drifted from DESIGN.md.
    {
      filename: RECIPE,
      code: '// DESIGN.md, Links. Tokens: `link`, `link-hover`.\nexport const r = defineRecipe({ base: "text-on-surface underline hover:text-primary-text" });',
      errors: [{ messageId: "drift", data: { component: "link", property: "typography", value: "body-md", expected: "text-body-md" } }],
    },
  ],
});
