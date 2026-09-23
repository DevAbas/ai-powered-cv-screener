"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import type { RecipeVariantProps } from "@/lib/recipe";
import { tooltipSlotRecipe } from "./Tooltip.recipe";

/** How long the pointer rests on the trigger before the tooltip starts to fade in. */
const OPEN_DELAY_MS = 150;

type TooltipVariants = RecipeVariantProps<typeof tooltipSlotRecipe>;

export interface TooltipTriggerProps {
  /** Spread onto the trigger when the tooltip adds to its accessible name. */
  "aria-describedby": string;
}

export interface TooltipProps {
  /** The short label shown in the tooltip. */
  content: ReactNode;
  /** Renders the trigger. Spread the props when the tooltip describes it; leave them out when it only repeats its label. */
  children: (trigger: TooltipTriggerProps) => ReactNode;
  /** @default "top" */
  side?: TooltipVariants["side"];
  /** @default "center" */
  align?: TooltipVariants["align"];
  /** Start open (for previews). @default false */
  defaultOpen?: boolean;
}

/**
 * A short label for a control, shown on hover (after a short delay) and on
 * keyboard focus; Escape closes it (WCAG 1.4.13). Not interactive itself.
 */
export function Tooltip({ content, children, side, align, defaultOpen = false }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(() => clear, []);

  function show(delay: number) {
    clear();
    timer.current = setTimeout(() => setOpen(true), delay);
  }

  function hide() {
    clear();
    setOpen(false);
  }

  function handleFocus(event: FocusEvent<HTMLSpanElement>) {
    // Keyboard focus only: a mouse click already had the hover.
    if (event.target.matches(":focus-visible")) show(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") hide();
  }

  const styles = tooltipSlotRecipe({ side, align, open });
  return (
    <span
      className={styles.root()}
      onPointerEnter={() => show(OPEN_DELAY_MS)}
      onPointerLeave={hide}
      onFocus={handleFocus}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {children({ "aria-describedby": id })}
      <span id={id} role="tooltip" className={styles.content()}>
        {content}
      </span>
    </span>
  );
}
