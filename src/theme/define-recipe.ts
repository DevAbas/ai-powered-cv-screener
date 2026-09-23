import { tv } from "tailwind-variants/lite";

// Recipes (`defineRecipe` / `defineSlotRecipe`: base, variants,
// defaultVariants, compoundVariants), built on tailwind-variants.
// The lite build has no tailwind-merge: a `className` passed to a component is
// appended, so overrides should be layout classes, not token classes.

/** A single-part recipe: `buttonRecipe({ variant, size, className })`. */
export const defineRecipe = tv;

/** A multi-part recipe: `const { root, item } = listSlotRecipe()`. */
export const defineSlotRecipe = tv;

export type { VariantProps as RecipeVariantProps } from "tailwind-variants/lite";
export { cx } from "tailwind-variants/lite";

/** DESIGN.md, Inputs: 2px focus ring in the `focus-ring` token colour, on keyboard focus. */
export const focusVisibleRing = "outline-none focus-visible:ring-2 focus-visible:ring-primary-outline";
