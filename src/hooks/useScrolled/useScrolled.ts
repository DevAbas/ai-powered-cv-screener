"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

const isScrolled = () => window.scrollY > 0;

/** Whether the page has scrolled away from the top. False on the server. */
export function useScrolled(): boolean {
  return useSyncExternalStore(subscribe, isScrolled, () => false);
}
