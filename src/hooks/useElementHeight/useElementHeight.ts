"use client";

import { useEffect, useState } from "react";

/**
 * An element's rendered height in px, kept current as it resizes; 0 while
 * it is not mounted. Returns the ref to attach, so an element that mounts
 * later (the composer once the first question is asked) is picked up.
 */
export function useElementHeight(): [ref: (element: HTMLElement | null) => void, height: number] {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, height];
}
