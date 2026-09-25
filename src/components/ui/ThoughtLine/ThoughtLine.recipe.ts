import { defineSlotRecipe, focusVisibleRing } from "@/components/ui/recipe";

// DESIGN.md, Components: States and Icons; Layout: loading motion. Tokens:
// icon, icon-disabled. One line in label-lg that breathes while working
// and settles into a sentence; its trace of steps in body-sm.
export const thoughtLineSlotRecipe = defineSlotRecipe({
  slots: {
    root: "inline-flex max-w-full flex-col items-start text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface",
    head: ["group relative inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap", focusVisibleRing],
    glyph: "inline-flex size-4 shrink-0 transition-colors",
    label: "inline-grid overflow-hidden transition-[width]",
    // Both labels share one cell: the one out of view is hidden once it has faded, and the status repeats
    // the visible one for screen readers only, so a copy of the line picks up the visible label once.
    text: "col-start-1 row-start-1 w-max transition-[opacity,visibility]",
    breath: "inline-block",
    timer: "text-on-surface-variant tabular-nums",
    chevron: "inline-flex size-4 text-on-surface-variant transition-transform group-aria-expanded:rotate-180",
    status: "sr-only select-none",
    // The fold takes the longest motion DESIGN.md allows, decelerating in and accelerating out.
    trace: "grid w-0 min-w-full grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-decelerate aria-hidden:grid-rows-[0fr] aria-hidden:ease-accelerate",
    fold: "min-h-0 overflow-y-clip",
    steps: "flex w-max flex-col gap-1.5 pt-2 pb-0.5 pl-6 text-body-sm leading-body-sm font-(weight:--font-weight-body-sm) whitespace-nowrap",
    step: "flex items-center gap-2",
    mark: "inline-grid size-4 shrink-0 place-items-center text-on-surface-variant",
    pulse: "size-1.5 rounded-full bg-current motion-safe:animate-breath",
  },
  variants: {
    working: {
      true: {
        glyph: "text-on-surface-variant motion-safe:animate-breath",
        breath: "motion-safe:animate-shimmer motion-safe:shimmer-text",
      },
      false: {
        glyph: "text-outline-variant",
      },
    },
    toggle: {
      true: { head: "cursor-pointer" },
      false: {},
    },
    active: {
      true: { text: "opacity-100" },
      false: { text: "invisible opacity-0" },
    },
    done: {
      true: { text: "text-on-surface-variant", step: "text-on-surface-variant" },
      false: { step: "text-on-surface" },
    },
  },
  defaultVariants: {
    working: true,
    toggle: false,
    active: false,
    done: false,
  },
});
