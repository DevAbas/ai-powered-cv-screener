import type { Answer } from "@/contracts/answer";
import type { AnswerModelId, ProgressStage } from "@/contracts/ask";
import type { ExchangeStatus } from "@/components/ChatExchange";

// Session state of the screen (PRD, UX principles: context is not lost).
// Pure, so every transition is unit-tested; nothing persists (PRD, Non-goals).

export interface ExchangeState {
  id: string;
  question: string;
  status: ExchangeStatus;
  steps: { stage: ProgressStage; message: string }[];
  /** The request passed the "Taking longer than usual…" threshold. */
  slow: boolean;
  answer?: Answer;
  error?: { message: string; retryable: boolean };
}

export interface ChatState {
  exchanges: ExchangeState[];
  model: AnswerModelId;
}

export type ChatAction =
  | { type: "asked"; exchangeId: string; question: string }
  | { type: "retried"; exchangeId: string }
  | { type: "progress"; exchangeId: string; stage: ProgressStage; message: string }
  | { type: "answered"; exchangeId: string; answer: Answer }
  | { type: "failed"; exchangeId: string; message: string; retryable: boolean }
  | { type: "stopped"; exchangeId: string }
  | { type: "slowNotice"; exchangeId: string }
  | { type: "modelChanged"; model: AnswerModelId };

export function initialChatState(model: AnswerModelId): ChatState {
  return { exchanges: [], model };
}

export function isRunning(state: ChatState): boolean {
  return state.exchanges.some((exchange) => exchange.status === "running");
}

const RUNNING = { status: "running", steps: [], slow: false, answer: undefined, error: undefined } as const;

/** Applies `update` to the running exchange with `exchangeId`; events for a finished exchange are ignored. */
function updateRunning(state: ChatState, exchangeId: string, update: (exchange: ExchangeState) => ExchangeState): ChatState {
  return {
    ...state,
    exchanges: state.exchanges.map((exchange) => (exchange.id === exchangeId && exchange.status === "running" ? update(exchange) : exchange)),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "asked":
      return { ...state, exchanges: [...state.exchanges, { id: action.exchangeId, question: action.question, ...RUNNING, steps: [] }] };
    case "retried":
      return {
        ...state,
        exchanges: state.exchanges.map((exchange) => (exchange.id === action.exchangeId ? { ...exchange, ...RUNNING, steps: [] } : exchange)),
      };
    case "progress":
      return updateRunning(state, action.exchangeId, (exchange) => {
        const step = { stage: action.stage, message: action.message };
        const known = exchange.steps.some((s) => s.stage === action.stage);
        return {
          ...exchange,
          steps: known ? exchange.steps.map((s) => (s.stage === action.stage ? step : s)) : [...exchange.steps, step],
        };
      });
    case "answered":
      return updateRunning(state, action.exchangeId, (exchange) => ({ ...exchange, status: "answered", answer: action.answer }));
    case "failed":
      return updateRunning(state, action.exchangeId, (exchange) => ({
        ...exchange,
        status: "error",
        error: { message: action.message, retryable: action.retryable },
      }));
    case "stopped":
      return updateRunning(state, action.exchangeId, (exchange) => ({ ...exchange, status: "stopped" }));
    case "slowNotice":
      return updateRunning(state, action.exchangeId, (exchange) => ({ ...exchange, slow: true }));
    case "modelChanged":
      return { ...state, model: action.model };
  }
}
