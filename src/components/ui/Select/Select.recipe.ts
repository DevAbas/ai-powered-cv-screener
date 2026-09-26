import { defineSlotRecipe, focusVisibleRing } from "@/components/ui/recipe";

// DESIGN.md, Menus and Model menu. Tokens: `model-chip`, `model-chip-hover`,
// `model-chip-pressed`, `menu`, `menu-item`, `menu-item-hover`; the selected
// row is marked by the check only.
export const selectSlotRecipe = defineSlotRecipe({
  slots: {
    trigger: [
      "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-3 transition-colors",
      "bg-surface-container text-label-md text-on-surface",
      "enabled:hover:bg-surface-container-high aria-expanded:bg-surface-container-high enabled:active:bg-surface-container-highest",
      "disabled:cursor-not-allowed disabled:text-on-surface-variant",
      focusVisibleRing,
    ],
    valueText: "truncate",
    indicator: "size-4 shrink-0 text-on-surface-variant",
    content: [
      "group/menu z-10 min-w-(--button-width) rounded-lg bg-surface-container-lowest p-1.5 shadow-overlay outline-none",
      "[--anchor-gap:--spacing(2)] transition duration-(--motion-duration-short) ease-decelerate data-closed:opacity-0",
    ],
    item: [
      "group flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2",
      "text-body-sm text-on-surface",
      // The selected row has no background; the check marks it. The pointer
      // highlights by hover; the active row (`data-focus`) shows only while
      // the user is on the keyboard, so opening by mouse highlights nothing.
      "hover:bg-surface-container-low group-data-[modality=keyboard]/menu:data-focus:bg-surface-container-low",
    ],
    itemText: "flex-1 truncate",
    itemIndicator: "invisible size-4 shrink-0 text-primary-text group-aria-selected:visible",
  },
});
