import { defineRecipe, focusVisibleRing } from "@/components/ui/recipe";

// DESIGN.md, Links. Tokens: `link`, `link-hover` (`primary-text`).
export const linkRecipe = defineRecipe({
  base: [
    "rounded-sm text-body-md text-on-surface underline underline-offset-2 transition-colors hover:text-primary-text",
    focusVisibleRing,
  ],
});
