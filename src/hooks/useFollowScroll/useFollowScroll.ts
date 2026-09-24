"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

/** Keys that scroll the page up, which means the reader wants to stay where they are. */
const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

/**
 * Keeps the end of an element in view while it grows, so a response never
 * disappears under the composer: whenever `signal` changes, the element's
 * end is scrolled into view. Following stops as soon
 * as the reader scrolls up, and `follow()` re-arms it for the next question.
 */
export function useFollowScroll(ref: RefObject<HTMLElement | null>, signal: string): () => void {
  const following = useRef(false);

  useEffect(() => {
    const stop = () => {
      following.current = false;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) stop();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (UP_KEYS.has(event.key)) stop();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    // "end", not "nearest": a response taller than the viewport still keeps its newest lines in view.
    if (following.current) ref.current?.scrollIntoView({ block: "end" });
  }, [ref, signal]);

  return useCallback(() => {
    following.current = true;
  }, []);
}
