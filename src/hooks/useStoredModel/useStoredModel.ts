"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { AnswerModelId } from "@/contracts/ask";
import { readStoredModel, writeStoredModel } from "@/lib/chat/stored-model";

// The browser's storage as an external store (React docs, useSyncExternalStore):
// the server snapshot is the recommended model, so the first render agrees
// on both sides, and the stored choice shows once hydrated.

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const getSnapshot = (): AnswerModelId => readStoredModel(window.localStorage);
const getServerSnapshot = (): AnswerModelId => readStoredModel(undefined);

/** The selected answer model, kept across reloads (PLAN, User interface). */
export function useStoredModel(): { model: AnswerModelId; setModel: (model: AnswerModelId) => void } {
  const model = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setModel = useCallback((next: AnswerModelId) => {
    writeStoredModel(window.localStorage, next);
    for (const listener of listeners) listener();
  }, []);
  return { model, setModel };
}
