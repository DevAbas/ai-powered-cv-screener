import type { HistoryTurn } from "@/contracts/ask";
import { HISTORY_ANSWER_MAX } from "@/contracts/ask";
import { answerAsText } from "@/lib/answer-text";
import type { ExchangeState } from "./state";

/** The request allows at most this many exchanges (AskRequestSchema; a test keeps them equal). */
export const HISTORY_LIMIT = 10;

/** An earlier answer as context: whole when short, otherwise its start, which carries the answer itself. */
function contextText(text: string): string {
  return text.length <= HISTORY_ANSWER_MAX ? text : `${text.slice(0, HISTORY_ANSWER_MAX - 1)}…`;
}

/**
 * Context for a follow-up (PRD, Conversation): the last answered exchanges,
 * each with its text and its view in words, so the model sees what it
 * showed, and the candidates the view showed.
 */
export function historyFrom(exchanges: readonly ExchangeState[]): HistoryTurn[] {
  return exchanges
    .flatMap((exchange) => {
      const answer = exchange.status === "answered" ? answerAsText(exchange.text, exchange.view) : "";
      return answer ? [{ question: exchange.question, answer: contextText(answer), candidateIds: exchange.sources.map((s) => s.candidateId) }] : [];
    })
    .slice(-HISTORY_LIMIT);
}
