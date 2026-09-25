import type { ComponentProps } from "react";
import { cx } from "@/components/ui/recipe";

export type LogoMarkProps = ComponentProps<"svg">;

/**
 * "CV" as outlines: Google Sans at `typography.mark` (600, 0.875rem of a
 * 1.75rem square, 0.02em tracking), traced from the font and centred on
 * its bounding box. No font loads, so it sits the same
 * everywhere; `app/icon.svg` is the same drawing.
 */
export const LOGO_MARK_PATH =
  "M9.60 19.24Q8.50 19.24 7.54 18.84Q6.59 18.44 5.88 17.73Q5.16 17.01 4.77 16.06Q4.37 15.11 4.37 14.00Q4.37 12.89 4.77 11.94Q5.16 10.99 5.88 10.27Q6.59 9.56 7.54 9.16Q8.50 8.76 9.60 8.76Q10.40 8.76 11.07 8.95Q11.74 9.15 12.30 9.51Q12.87 9.87 13.34 10.40L12.13 11.57Q11.81 11.19 11.44 10.93Q11.06 10.67 10.61 10.53Q10.16 10.39 9.62 10.39Q8.64 10.39 7.84 10.84Q7.04 11.28 6.57 12.09Q6.10 12.90 6.10 14.00Q6.10 15.09 6.57 15.90Q7.04 16.72 7.84 17.16Q8.64 17.61 9.62 17.61Q10.49 17.61 11.17 17.25Q11.85 16.88 12.37 16.25L13.60 17.41Q13.12 17.98 12.51 18.39Q11.89 18.81 11.16 19.02Q10.43 19.24 9.60 19.24ZM18.18 19.01 14.63 8.99H16.49L18.67 15.34L19.03 16.55H19.12L19.51 15.34L21.77 8.99H23.63L19.97 19.01Z";

/** The mark alone: "CV" on the mint square (DESIGN.md `logo`). */
export function LogoMark({ className, ...rest }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden {...rest} className={cx("size-7 shrink-0", className)}>
      {/* DESIGN.md `logo`: primary, on-primary, rounded.sm (8 of 28) */}
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <path d={LOGO_MARK_PATH} className="fill-on-primary" />
    </svg>
  );
}
