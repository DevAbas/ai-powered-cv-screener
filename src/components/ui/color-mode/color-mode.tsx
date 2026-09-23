"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import type { IconButtonProps } from "@/components/ui/button";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Switches the session's colour mode. The theme itself is pure CSS
 * (src/styles/theme.css): the system setting applies until this sets
 * `data-theme` on <html>. Nothing is stored and nothing runs before paint.
 */
export function toggleColorMode() {
  const root = document.documentElement;
  const current = root.dataset.theme ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");
  root.dataset.theme = current === "dark" ? "light" : "dark";
}

export type ColorModeButtonProps = Omit<IconButtonProps, "aria-label" | "children" | "onClick">;

/** Moon in light mode, Sun in dark mode, switched by the `dark:` variant so the server render matches. */
export function ColorModeButton({ variant = "ghost", ...rest }: ColorModeButtonProps) {
  return (
    <IconButton aria-label="Switch between light and dark theme" variant={variant} {...rest} onClick={toggleColorMode}>
      <Moon aria-hidden className="dark:hidden" />
      <Sun aria-hidden className="hidden dark:block" />
    </IconButton>
  );
}
