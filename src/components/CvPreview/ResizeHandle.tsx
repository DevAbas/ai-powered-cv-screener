"use client";

import type { ComponentProps } from "react";
import { cx } from "@/lib/recipe";

export type ResizeHandleProps = ComponentProps<"div">;

/**
 * The strip along the preview's left edge that resizes it by dragging: a
 * faint line that fills in on hover and while dragging (DESIGN.md,
 * Components: CV preview).
 */
export function ResizeHandle({ className, ...rest }: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the preview"
      {...rest}
      className={cx(
        "group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center",
        className,
      )}
    >
      {/* DESIGN.md `divider` at rest, `icon-disabled` (outline-variant) on hover and while dragging */}
      <div className="h-full w-px bg-outline transition-colors group-hover:bg-outline-variant group-active:bg-outline-variant" />
    </div>
  );
}
