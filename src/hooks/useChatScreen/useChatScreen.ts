"use client";

import { useReducer } from "react";
import type { AskTransport } from "@/lib/conversation";
import { historyFrom } from "@/hooks/useChatScreen/chatHistory";
import { chatReducer, initialChatState, isRunning } from "@/hooks/useChatScreen/chatState";
import type { ExchangeState } from "@/hooks/useChatScreen/chatState";
import { useAskStream } from "@/hooks/useAskStream";

const LOST_MESSAGE = "The request did not finish. Try again.";

export interface ChatScreenOptions {
  /** Where questions go: the API by default, the mock in previews and tests. */
  transport?: AskTransport;
}

/** The screen's session state and the recruiter's actions on it. */
export function useChatScreen({ transport }: ChatScreenOptions = {}) {
  const [state, dispatch] = useReducer(chatReducer, undefined, initialChatState);
  const stream = useAskStream(transport);

  function run(exchangeId: string, question: string, previous: readonly ExchangeState[]) {
    void stream.start(
      { question, history: historyFrom(previous) },
      {
        onEvent(event) {
          switch (event.type) {
            case "progress":
              return dispatch({ type: "progress", exchangeId, stage: event.stage, message: event.message });
            case "delta":
              return dispatch({ type: "delta", exchangeId, text: event.text });
            case "answer":
              return dispatch({ type: "answered", exchangeId, text: event.text, view: event.view, sources: event.sources, matched: event.matched, answeredBy: event.answeredBy });
            case "error":
              return dispatch({ type: "failed", exchangeId, message: event.message, retryable: event.retryable });
          }
        },
        onSlow: () => dispatch({ type: "slowNotice", exchangeId }),
        onStopped: () => dispatch({ type: "stopped", exchangeId }),
        onLost: () => dispatch({ type: "failed", exchangeId, message: LOST_MESSAGE, retryable: true }),
      },
    );
  }

  return {
    state,
    running: isRunning(state),

    ask(question: string) {
      if (isRunning(state)) return;
      const exchangeId = crypto.randomUUID();
      dispatch({ type: "asked", exchangeId, question });
      run(exchangeId, question, state.exchanges);
    },

    /** Reruns a failed exchange in place, with the history that preceded it. */
    retry(exchangeId: string) {
      if (isRunning(state)) return;
      const index = state.exchanges.findIndex((exchange) => exchange.id === exchangeId);
      if (index === -1) return;
      dispatch({ type: "retried", exchangeId });
      run(exchangeId, state.exchanges[index].question, state.exchanges.slice(0, index));
    },

    stop: stream.stop,
  };
}
