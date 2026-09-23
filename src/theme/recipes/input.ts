import { defineRecipe, focusVisibleRing } from "../define-recipe";

// DESIGN.md, Inputs. Tokens: input, input-placeholder.
export const inputRecipe = defineRecipe({
  base: [
    "w-full min-w-0 text-body-lg leading-body-lg text-on-surface",
    "placeholder:text-on-surface-variant disabled:cursor-not-allowed",
  ],
  variants: {
    variant: {
      /** No border at rest; the background step separates it from `surface`. */
      subtle: ["h-10 rounded-md bg-surface-container-lowest px-3", focusVisibleRing],
      /** No chrome: the container owns background, radius and focus ring (the composer). */
      plain: "bg-transparent px-1 outline-none",
    },
  },
  defaultVariants: {
    variant: "subtle",
  },
});
