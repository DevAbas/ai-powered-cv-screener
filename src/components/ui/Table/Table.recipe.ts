import { defineSlotRecipe } from "@/components/ui/recipe";

// DESIGN.md, Tables. Tokens: `table-header`, `table-cell`. Horizontal rules
// only, no vertical rules, no zebra striping.
export const tableSlotRecipe = defineSlotRecipe({
  slots: {
    root: "w-full border-collapse text-left",
    caption: "sr-only",
    header: "",
    body: "",
    row: "border-b border-outline last:border-b-0 [thead_&]:border-b",
    columnHeader: "py-2 pr-4 align-bottom text-label-sm text-on-surface-variant uppercase",
    // A row's header reads as a header too: a criterion in a comparison.
    rowHeader: "py-2 pr-4 align-top text-label-sm leading-(--text-body-md--line-height) text-on-surface-variant uppercase",
    cell: "py-2 pr-4 align-top text-body-md text-on-surface",
  },
});
