"use client";

import { useSyncExternalStore } from "react";

export type InteractionModality = "keyboard" | "pointer";

// One module-level store: the last kind of input the user gave anywhere on the
// page. Listeners attach while any component is subscribed.
let modality: InteractionModality = "pointer";
const subscribers = new Set<() => void>();

function set(next: InteractionModality) {
  if (next === modality) return;
  modality = next;
  subscribers.forEach((notify) => notify());
}

const onKey = (event: KeyboardEvent) => {
  if (!event.metaKey && !event.ctrlKey && !event.altKey) set("keyboard");
};
const onPointer = () => set("pointer");

function subscribe(notify: () => void) {
  if (subscribers.size === 0) {
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("pointermove", onPointer, true);
  }
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("pointermove", onPointer, true);
    }
  };
}

/**
 * Whether the user is currently driving the page with the keyboard or a
 * pointer, so keyboard-only affordances (the active menu row) stay hidden for
 * mouse users. Starts as "pointer", and on the server.
 */
export function useInteractionModality(): InteractionModality {
  return useSyncExternalStore(subscribe, () => modality, () => "pointer");
}
