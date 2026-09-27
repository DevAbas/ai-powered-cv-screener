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

/**
 * Trims a text box to its cap height, so an icon centred beside it lines up
 * with the capitals instead of the taller line box (Chromium 133+, Safari
 * 18.2+; elsewhere the box is untrimmed and the icon sits about 1px low).
 */
export const capHeightBox = "[text-box:trim-both_cap_alphabetic]";

/** DESIGN.md, Inputs: a focus ring in the `focus-ring` token colour, on keyboard focus; its 2px width is this file's. */
export const focusVisibleRing = "outline-none focus-visible:ring-2 focus-visible:ring-primary-outline";
