"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampPreviewWidth, defaultPreviewWidth, PREVIEW_OPEN_MIN_WIDTH, widthFromPointer } from "@/lib/preview/width";

export interface ResizablePanel {
  /** Current width in px, clamped to the viewport. */
  width: number;
  /** A drag is in progress. */
  dragging: boolean;
  /** Spread on the handle at the panel's left edge. */
  handleProps: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  };
}

/**
 * A panel docked to the right edge that a handle on its left edge resizes
 * by dragging. It opens at a share of the viewport (`defaultPreviewWidth`).
 * Pointer moves arrive faster than frames, so the width is committed once
 * per animation frame.
 */
export function useResizablePanel(): ResizablePanel {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? PREVIEW_OPEN_MIN_WIDTH : defaultPreviewWidth(window.innerWidth),
  );
  const [dragging, setDragging] = useState(false);
  const frame = useRef<number | null>(null);
  const pointerX = useRef(0);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }, []);
  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    pointerX.current = event.clientX;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setWidth(widthFromPointer(pointerX.current, window.innerWidth));
    });
  }, []);
  const end = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }, []);

  return {
    width: typeof window === "undefined" ? width : clampPreviewWidth(width, window.innerWidth),
    dragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
  };
}
