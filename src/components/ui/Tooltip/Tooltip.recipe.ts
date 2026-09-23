import { defineSlotRecipe } from "@/lib/recipe";

// DESIGN.md, Tooltips. Token: tooltip (inverse-surface, inverse-on-surface,
// label-md, rounded.md).
export const tooltipSlotRecipe = defineSlotRecipe({
  slots: {
    root: "relative inline-flex",
    content: [
      "pointer-events-none absolute z-20 w-max max-w-xs px-2.5 py-1.5",
      "rounded-md bg-inverse-surface text-label-md leading-label-md font-(weight:--font-weight-label-md) text-inverse-on-surface",
      "transition-opacity duration-150 ease-decelerate",
    ],
  },
  variants: {
    side: {
      top: { content: "bottom-full mb-2" },
      bottom: { content: "top-full mt-2" },
    },
    align: {
      start: { content: "left-0" },
      center: { content: "left-1/2 -translate-x-1/2" },
      end: { content: "right-0" },
    },
    open: {
      true: { content: "opacity-100" },
      false: { content: "opacity-0" },
    },
  },
  defaultVariants: {
    side: "top",
    align: "center",
    open: false,
  },
});
