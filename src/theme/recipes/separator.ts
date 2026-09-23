import { defineRecipe } from "../define-recipe";

// DESIGN.md token: divider. One border colour.
export const separatorRecipe = defineRecipe({
  base: "shrink-0 border-0 bg-outline",
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});
