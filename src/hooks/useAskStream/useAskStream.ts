"use client";

import { useEffect, useRef } from "react";
import type { AskEvent, AskRequest } from "@/contracts/ask";
import { ask } from "@/lib/ask/client";

/** After this long without an answer, a neutral notice appears (PLAN, User interface). */
export const SLOW_NOTICE_MS = 10_000;

export interface AskStreamHandlers {
  /** Each progress event, then one answer or error. */
  onEvent: (event: AskEvent) => void;
  /** The request passed SLOW_NOTICE_MS without finishing. */
  onSlow: () => void;
  /** `stop()` aborted the request. */
  onStopped: () => void;
  /** The stream broke off without an answer or error. */
  onLost: () => void;
}

/**
 * Runs one `ask` request at a time. `stop()` aborts it without fallback
 * (PLAN, User interface); unmounting aborts it too.
 */
export function useAskStream() {
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  async function start(request: AskRequest, handlers: AskStreamHandlers) {
    const current = new AbortController();
    controller.current = current;
    const slowTimer = setTimeout(handlers.onSlow, SLOW_NOTICE_MS);
    try {
      for await (const event of ask(request, current.signal)) handlers.onEvent(event);
    } catch {
      if (current.signal.aborted) handlers.onStopped();
      else handlers.onLost();
    } finally {
      clearTimeout(slowTimer);
      if (controller.current === current) controller.current = null;
    }
  }

  function stop() {
    controller.current?.abort();
  }

  return { start, stop };
}
