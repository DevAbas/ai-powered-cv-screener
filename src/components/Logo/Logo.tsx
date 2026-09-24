import type { ComponentProps } from "react";
import { capHeightBox, cx } from "@/lib/recipe";
import { LogoMark } from "./LogoMark";

export type LogoProps = ComponentProps<"span">;

/**
 * The product mark and wordmark (DESIGN.md, Components: Logo). Reads as
 * "CV Screener"; the mark is the only solid mint element besides the
 * primary action.
 */
export function Logo({ className, ...rest }: LogoProps) {
  return (
    <span {...rest} className={cx("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="sr-only">CV </span>
      {/*
        DESIGN.md `logo-wordmark`: on-surface, wordmark (uppercase, 600, letter-spaced).
        Trimmed to its capitals, so they centre on the mark rather than the line box.
      */}
      <span className={cx("text-wordmark leading-wordmark tracking-wordmark font-(weight:--font-weight-wordmark) text-on-surface uppercase", capHeightBox)}>
        Screener
      </span>
    </span>
  );
}
