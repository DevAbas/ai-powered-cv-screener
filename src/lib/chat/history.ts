import type { Answer } from "@/contracts/answer";
import type { HistoryTurn } from "@/contracts/ask";
import type { ExchangeState } from "./state";

/** The request allows at most this many exchanges (AskRequestSchema; a test keeps them equal). */
export const HISTORY_LIMIT = 10;

/** Every candidate an answer refers to, in order of appearance. */
export function candidateIdsOf(answer: Answer): string[] {
  const ids = [
    ...(answer.candidates ?? []).map((c) => c.candidateId),
    ...(answer.comparison?.candidateIds ?? []),
    ...(answer.fact ? [answer.fact.candidateId] : []),
    ...(answer.profile ? [answer.profile.candidateId] : []),
  ];
  return [...new Set(ids)];
}

/** Context for a follow-up (PRD, Conversation): the last answered exchanges. */
export function historyFrom(exchanges: readonly ExchangeState[]): HistoryTurn[] {
  return exchanges
    .flatMap((exchange) =>
      exchange.status === "answered" && exchange.answer
        ? [
            {
              question: exchange.question,
              kind: exchange.answer.kind,
              summary: exchange.answer.summary,
              candidateIds: candidateIdsOf(exchange.answer),
            },
          ]
        : [],
    )
    .slice(-HISTORY_LIMIT);
}
