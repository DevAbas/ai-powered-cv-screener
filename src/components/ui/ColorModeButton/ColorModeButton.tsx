"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import type { IconButtonProps } from "@/components/ui/Button";
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

/** Moon in light mode, Sun in dark mode, switched by the `dark:` variant so the server render matches; a press plays the switch click. */
export function ColorModeButton({ variant = "ghost", ...rest }: ColorModeButtonProps) {
  return (
    <IconButton aria-label="Switch between light and dark theme" variant={variant} {...rest} onClick={onToggle}>
      <Moon aria-hidden className="dark:hidden" />
      <Sun aria-hidden className="hidden dark:block" />
    </IconButton>
  );
}
