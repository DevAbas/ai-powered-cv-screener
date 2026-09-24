"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

/** Keys that scroll the page up, which means the reader wants to stay where they are. */
const UP_KEYS = new Set(["ArrowUp", "PageUp", "Home"]);

/**
 * Keeps the end of an element in view while it grows, so a response never
 * disappears under the composer: whenever `signal` changes, the element's
 * end is scrolled into view; a change of `key` (a new element) is left to
 * the caller. Following stops as soon as the reader scrolls up, and
 * `follow()` re-arms it for the next question.
 */
export function useFollowScroll(ref: RefObject<HTMLElement | null>, key: string, signal: string): () => void {
  const following = useRef(false);
  const seenKey = useRef(key);

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
    const element = ref.current;
    // A new element is the caller's to place (the question scrolls to the top); following starts with its next change.
    if (seenKey.current !== key) {
      seenKey.current = key;
      return;
    }
    if (!following.current || !element) return;
    // Only for an element too tall to sit between header and composer (its
    // scroll margins) whose end has gone out of view: "end" then keeps the
    // newest lines visible. A shorter one stays where the caller put it.
    const style = getComputedStyle(element);
    const margins = (parseFloat(style.scrollMarginTop) || 0) + (parseFloat(style.scrollMarginBottom) || 0);
    const rect = element.getBoundingClientRect();
    const tooTall = rect.height + margins > window.innerHeight;
    if (tooTall && rect.bottom + (parseFloat(style.scrollMarginBottom) || 0) > window.innerHeight) element.scrollIntoView({ block: "end" });
  }, [ref, key, signal]);

  return useCallback(() => {
    following.current = true;
  }, []);
}
