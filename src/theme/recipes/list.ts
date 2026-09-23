import { defineSlotRecipe, focusVisibleRing } from "../define-recipe";

// DESIGN.md, Lists. Tokens: list-item, list-item-hover, list-item-selected;
// rows separated by `outline`.
export const listSlotRecipe = defineSlotRecipe({
  slots: {
    root: "divide-y divide-outline",
    item: "",
    itemTrigger: [
      "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors",
      "bg-surface-container-lowest text-body-md leading-body-md text-on-surface",
      "hover:bg-surface-container-low aria-[current=true]:bg-surface-container-high",
      focusVisibleRing,
    ],
  },
});
