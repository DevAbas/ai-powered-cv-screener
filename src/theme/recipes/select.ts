import { defineSlotRecipe, focusVisibleRing } from "../define-recipe";

// DESIGN.md, Menus and Model menu. Tokens: model-chip, model-chip-hover,
// model-chip-pressed, menu,
// menu-item, menu-item-hover, menu-item-selected.
export const selectSlotRecipe = defineSlotRecipe({
  slots: {
    trigger: [
      "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-3 transition-colors",
      "bg-surface-container text-label-md leading-label-md font-(weight:--font-weight-label-md) text-on-surface",
      "enabled:hover:bg-surface-container-high aria-expanded:bg-surface-container-high enabled:active:bg-surface-container-highest",
      "disabled:cursor-not-allowed disabled:text-on-surface-variant",
      focusVisibleRing,
    ],
    valueText: "truncate",
    indicator: "size-4 shrink-0 text-on-surface-variant",
    content: [
      "z-10 min-w-(--button-width) rounded-lg bg-surface-container-lowest p-1 shadow-overlay outline-none",
      "[--anchor-gap:--spacing(2)] transition duration-150 ease-decelerate data-closed:opacity-0",
    ],
    item: [
      "group flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2",
      "text-body-md leading-body-md text-on-surface",
      "data-focus:bg-surface-container-low aria-selected:bg-surface-container-high",
    ],
    itemText: "flex-1 truncate",
    itemIndicator: "invisible size-4 shrink-0 text-primary group-aria-selected:visible",
  },
});
