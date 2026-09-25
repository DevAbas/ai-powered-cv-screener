import type { AnsweredBy, AnswerMatched, AnswerSource, ProgressStage, AnswerView } from "@/contracts";
import type { ExchangeStatus } from "@/components/ChatExchange";

// Session state of the screen (PRD, UX principles: context is not lost).
// Pure, so every transition is unit-tested; the conversation never persists
// (PRD, Non-goals).

export interface ExchangeState {
  id: string;
  question: string;
  status: ExchangeStatus;
  steps: { stage: ProgressStage; message: string }[];
  /** The request passed the "Taking longer than usual…" threshold. */
  slow: boolean;
  /** The answer so far while it streams; the whole answer once answered. */
  text: string;
  /** The data under the answer, drawn from the CVs; set when answered with one. */
  view?: AnswerView;
  /** The CVs the view shows; set when answered. */
  sources: AnswerSource[];
  /** What the search did; set when answered, null when no tool ran. */
  matched?: AnswerMatched | null;
  /** Which model answered; set when answered. */
  answeredBy?: AnsweredBy;
  error?: { message: string; retryable: boolean };
}

export interface ChatState {
  exchanges: ExchangeState[];
}

export type ChatAction =
  | { type: "asked"; exchangeId: string; question: string }
  | { type: "retried"; exchangeId: string }
  | { type: "progress"; exchangeId: string; stage: ProgressStage; message: string }
  | { type: "delta"; exchangeId: string; text: string }
  | { type: "answered"; exchangeId: string; text: string; view?: AnswerView; sources: AnswerSource[]; matched: AnswerMatched | null; answeredBy: AnsweredBy }
  | { type: "failed"; exchangeId: string; message: string; retryable: boolean }
  | { type: "stopped"; exchangeId: string }
  | { type: "slowNotice"; exchangeId: string };

export function initialChatState(): ChatState {
  return { exchanges: [] };
}

export function isRunning(state: ChatState): boolean {
  return state.exchanges.some((exchange) => exchange.status === "running");
}

const RUNNING = { status: "running", slow: false, text: "", view: undefined, matched: undefined, answeredBy: undefined, error: undefined } as const;

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
      return {
        ...state,
        exchanges: [...state.exchanges, { id: action.exchangeId, question: action.question, ...RUNNING, steps: [], sources: [] }],
      };
    case "retried":
      return {
        ...state,
        exchanges: state.exchanges.map((exchange) =>
          exchange.id === action.exchangeId ? { ...exchange, ...RUNNING, steps: [], sources: [] } : exchange,
        ),
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
    case "delta":
      return updateRunning(state, action.exchangeId, (exchange) => ({ ...exchange, text: exchange.text + action.text }));
    case "answered":
      return updateRunning(state, action.exchangeId, (exchange) => ({
        ...exchange,
        status: "answered",
        text: action.text,
        view: action.view,
        sources: action.sources,
        matched: action.matched,
        answeredBy: action.answeredBy,
      }));
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
  }
}
