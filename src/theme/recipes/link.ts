import { defineRecipe, focusVisibleRing } from "../define-recipe";

// DESIGN.md, Links. Tokens: link, link-hover.
export const linkRecipe = defineRecipe({
  base: [
    "cursor-pointer rounded-sm text-left text-on-surface underline underline-offset-2 transition-colors hover:text-primary",
    focusVisibleRing,
  ],
});
