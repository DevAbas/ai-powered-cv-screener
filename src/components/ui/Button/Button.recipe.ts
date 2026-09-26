import { defineRecipe, focusVisibleRing } from "@/components/ui/recipe";

// DESIGN.md, Buttons and Icons. Tokens: `button-primary`, `button-primary-hover`,
// `button-primary-pressed`, `button-secondary`, `button-secondary-hover`,
// `button-secondary-pressed`, `button-disabled`; ghost uses `icon`, `icon-hover`,
// `icon-pressed` and `icon-disabled`. Pressed is the native `:active` state.
export const buttonRecipe = defineRecipe({
  base: [
    "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap select-none",
    "rounded-full text-label-md transition-colors",
    "disabled:cursor-not-allowed [&_svg]:shrink-0",
    focusVisibleRing,
  ],
  variants: {
    variant: {
      primary: [
        "bg-primary text-on-primary enabled:hover:bg-primary-hover enabled:active:bg-primary-pressed",
        "disabled:bg-surface-container disabled:text-on-surface-variant",
      ],
      secondary: [
        "bg-surface-container text-on-surface enabled:hover:bg-surface-container-high enabled:active:bg-surface-container-highest",
        "disabled:bg-surface-container disabled:text-on-surface-variant",
      ],
      ghost: [
        "bg-transparent text-on-surface-variant disabled:text-outline-variant",
        "enabled:hover:bg-surface-container-low enabled:hover:text-on-surface",
        "enabled:active:bg-surface-container-high enabled:active:text-on-surface",
      ],
    },
    // DESIGN.md, Components: icons 1rem in `xs` buttons, 1.25rem in the others.
    // An icon with its own size-* class keeps it.
    size: {
      xs: "h-7.5 min-w-7.5 gap-1 [&_svg:not([class*='size-'])]:size-4",
      sm: "h-8 min-w-8 gap-1.5 [&_svg:not([class*='size-'])]:size-5",
      md: "h-9 min-w-9 gap-2 [&_svg:not([class*='size-'])]:size-5",
    },
    /** Square, icon only (IconButton): no horizontal padding. */
    iconOnly: {
      true: "px-0",
      false: "",
    },
  },
  compoundVariants: [
    { iconOnly: false, size: "xs", class: "px-2.5" },
    { iconOnly: false, size: "sm", class: "px-3" },
    { iconOnly: false, size: "md", class: "px-4" },
  ],
  defaultVariants: {
    variant: "secondary",
    size: "md",
    iconOnly: false,
  },
});
