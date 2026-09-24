"use client";

import { useSyncExternalStore } from "react";

// The system's reduced-motion setting, live: decorative motion stops as soon
// as it is switched on (DESIGN.md, Layout: motion).

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(notify: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

/** True when the user asks for reduced motion; also true on the server, so nothing animates before hydration. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}
