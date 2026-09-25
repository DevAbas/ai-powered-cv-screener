import { defineSlotRecipe } from "@/components/ui/recipe";

// DESIGN.md, Layout (motion): the empty-state grid. Token: primary, as the
// canvas's text colour, which the strokes are drawn in.
export const cursorGridSlotRecipe = defineSlotRecipe({
  slots: {
    root: "pointer-events-none absolute inset-0 overflow-hidden",
    canvas: "block size-full text-primary",
  },
});
