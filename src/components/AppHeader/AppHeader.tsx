"use client";

import { ColorModeButton } from "@/components/ui/ColorModeButton";
import { useScrolled } from "@/hooks/useScrolled";
import { cx } from "@/lib/recipe";

export interface AppHeaderProps {
  poolSize: number;
}

/**
 * Product name, pool size and the colour mode toggle (PRD, Information
 * architecture). Stays at the top; once the conversation scrolls under it,
 * the raised shadow shows there is more above.
 */
export function AppHeader({ poolSize }: AppHeaderProps) {
  const scrolled = useScrolled();
  return (
    <header
      className={cx(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-outline bg-surface px-gutter transition-shadow",
        scrolled && "shadow-raised",
      )}
    >
      <div className="flex items-baseline gap-3">
        <h1 className="text-headline-md leading-headline-md font-(weight:--font-weight-headline-md) text-on-surface">
          CV Screener
        </h1>
        <p className="text-body-sm leading-body-sm text-on-surface-variant">{poolSize} CVs in the pool</p>
      </div>
      <ColorModeButton size="sm" />
    </header>
  );
}
