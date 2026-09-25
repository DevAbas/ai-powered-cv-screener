import { capHeightBox, defineSlotRecipe } from "@/components/ui/recipe";

// DESIGN.md, Components: States. Tokens: icon, state-icon-warning,
// state-icon-error. A single line of text with a small leading icon; colour
// only on the warning and error icons; never a box.
export const statusMessageSlotRecipe = defineSlotRecipe({
  slots: {
    root: "flex items-center gap-2 text-body-md leading-body-md text-on-surface",
    indicator: "size-4 shrink-0",
    text: capHeightBox,
  },
  variants: {
    status: {
      empty: { indicator: "text-on-surface-variant" },
      insufficient: { indicator: "text-warning" },
      "out-of-scope": { indicator: "text-on-surface-variant" },
      error: { indicator: "text-error" },
    },
  },
  defaultVariants: {
    status: "empty",
  },
});
