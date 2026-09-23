import { defineRecipe, focusVisibleRing } from "@/lib/recipe";

// DESIGN.md, Inputs. Tokens: input, input-placeholder. The multi-line field;
// same variants as `inputRecipe`.
export const textareaRecipe = defineRecipe({
  base: [
    "block w-full min-w-0 resize-none wrap-anywhere text-body-lg leading-body-lg text-on-surface",
    "placeholder:text-on-surface-variant disabled:cursor-not-allowed",
  ],
  variants: {
    variant: {
      /** No border at rest; the background step separates it from `surface`. */
      subtle: ["rounded-md bg-surface-container-lowest px-3 py-2", focusVisibleRing],
      /** No chrome: the container owns background, radius and focus ring (the composer). */
      plain: "bg-transparent px-1 outline-none",
    },
    /** Grows with its content; set a `max-h-*` class, past which it scrolls. */
    autoResize: {
      true: "overflow-y-auto",
      false: "",
    },
  },
  defaultVariants: {
    variant: "subtle",
    autoResize: false,
  },
});
