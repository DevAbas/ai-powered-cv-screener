"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import type { IconButtonProps } from "@/components/ui/Button";
import { cx } from "@/components/ui/recipe";
import { playSwitchClick } from "./switchClick";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export type ColorMode = "light" | "dark";

/**
 * Switches the session's colour mode and returns the new one. The theme
 * itself is pure CSS (src/styles/theme.css): the system setting applies
 * until this sets `data-theme` on <html>. Nothing is stored and nothing runs
 * before paint.
 */
export function toggleColorMode(): ColorMode {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");
  const next: ColorMode = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  return next;
}

/** The switch is heard as the lights: to light is "on", to dark is "off" (DESIGN.md, Colour mode toggle). */
function onToggle() {
  playSwitchClick(toggleColorMode() === "light" ? "on" : "off");
}

export type ColorModeButtonProps = Omit<IconButtonProps, "aria-label" | "children" | "onClick">;

/**
 * DESIGN.md, Colour mode toggle: the leaving icon turns 45°, shrinks to half
 * and fades as the arriving one turns in from the other side and settles
 * with a slight overshoot. Both icons are always present, one on top of the
 * other, so the `dark:` variant does the swap and the server render matches.
 */
const TURN = "col-start-1 row-start-1 size-6 motion-safe:transition-[rotate,scale,opacity] motion-safe:duration-(--motion-duration-color-mode-turn) motion-safe:ease-overshoot";

/** Moon in light mode, Sun in dark mode, turning from one to the other; a press plays the switch click. */
export function ColorModeButton({ variant = "ghost", ...rest }: ColorModeButtonProps) {
  return (
    <IconButton aria-label="Switch between light and dark theme" variant={variant} {...rest} onClick={onToggle}>
      {/* DESIGN.md, Colour mode toggle: a 1.5rem icon, larger than the other buttons' 1.25rem. */}
      <span aria-hidden className="grid">
        <Moon className={cx(TURN, "rotate-0 scale-100 opacity-100 dark:rotate-45 dark:scale-50 dark:opacity-0")} />
        <Sun className={cx(TURN, "rotate-45 scale-50 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100")} />
      </span>
    </IconButton>
  );
}
