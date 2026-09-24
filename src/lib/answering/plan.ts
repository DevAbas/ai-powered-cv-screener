import type { HistoryTurn } from "@/contracts/ask";
import type { QueryPlan } from "@/contracts/query";
import { nameTokens, normalizeForMatch } from "@/lib/retrieval/names";

// How a question is retrieved for, as the reference repo plans it
// (Minacava/cv-screener, lib/rag/query-plan.ts and the lookup promotion in
// app/api/chat/route.ts): hint rules decide when the intent is obvious, and
// the model plans the rest. Same hints, prompt and fallbacks.

const REFINE_HINTS =
  /\b(of these|among (them|these|those)|from (these|those|them)|de estos|de estas|entre (ellos|ellas|estos|estas)|tambien|también|also from|which of (them|these)|quiénes de|cuales de|cuáles de)\b/i;

const LOOKUP_HINTS = /\b(summarize|summary|profile|tell me about|who is|cv of|resume of|experiencia de|perfil de|resumen de)\b/i;

const SEARCH_HINTS = /\b(show|find|list|candidates?|with|experience in|skilled in|know|knows|saber|saben|muéstrame|muestrame|busca|buscar)\b/i;

/** Asks the model for a plan; tests pass a stub. */
export type QueryPlanner = (prompt: string, signal?: AbortSignal) => Promise<QueryPlan>;

const search = (searchQuery: string): QueryPlan => ({ intent: "search", searchQuery, candidateName: "" });
const lookup = (name: string): QueryPlan => ({ intent: "lookup", searchQuery: `CV profile of ${name}`, candidateName: name });

/** The candidates of the last answer that showed any: what "of these" refers to. */
export function priorCandidateIds(history: readonly HistoryTurn[]): string[] {
  for (let i = history.length - 1; i >= 0; i--) {
    const ids = history[i]?.candidateIds ?? [];
    if (ids.length > 0) return [...ids];
  }
  return [];
}

/** A retrieval query that keeps the earlier questions' criteria when narrowing. */
function combinedSearchQuery(history: readonly HistoryTurn[], latest: string): string {
  const prior = history.map((turn) => turn.question).filter((q) => !REFINE_HINTS.test(q) && !LOOKUP_HINTS.test(q));
  return prior.length === 0 ? latest : `${prior.join("; ")}; ${latest}`;
}

/** The person a lookup question names: its last capitalised phrase. */
function inferLookupName(query: string): string | null {
  if (!LOOKUP_HINTS.test(query)) return null;
  const proper = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g);
  return proper?.at(-1) ?? null;
}

/** The plan when the intent is obvious; null when the model has to decide. */
export function tryHeuristicQueryPlan(question: string, history: readonly HistoryTurn[], priorIds: readonly string[]): QueryPlan | null {
  if (history.length === 0 && priorIds.length === 0) {
    const name = inferLookupName(question);
    return name ? lookup(name) : search(question);
  }
  if (priorIds.length > 0 && REFINE_HINTS.test(question)) {
    return { intent: "refine", searchQuery: combinedSearchQuery(history, question), candidateName: "" };
  }
  const name = inferLookupName(question);
  if (name) return lookup(name);
  if (SEARCH_HINTS.test(question) && !REFINE_HINTS.test(question)) return search(question);
  return null;
}

/** The conversation as the model reads it: the last eight messages. */
function conversationSnippet(history: readonly HistoryTurn[], question: string): string {
  const messages = [
    ...history.flatMap((turn) => [`USER: ${turn.question}`, turn.answer.trim() ? `ASSISTANT: ${turn.answer.trim()}` : ""]),
    `USER: ${question}`,
  ].filter(Boolean);
  return messages.slice(-8).join("\n");
}

export function plannerPrompt(question: string, history: readonly HistoryTurn[], priorNames: readonly string[]): string {
  return `You classify CV-screening chat turns for retrieval.

Prior candidates from the last assistant answer (may be empty):
${priorNames.length > 0 ? priorNames.join(", ") : "(none)"}

Conversation:
${conversationSnippet(history, question)}

Rules:
- intent "refine": user narrows or filters the PREVIOUS candidate set (e.g. "of these who know AWS", "de estos cuáles saben React"). Requires prior candidates when possible. searchQuery must combine prior criteria with the new constraint (e.g. "candidates with React and AWS").
- intent "lookup": user asks about a specific person by name (summary, profile, experience). Set candidateName to the name as written (partial OK). searchQuery should target that person.
- intent "search": new skill/criteria search unrelated to narrowing the previous list. searchQuery is a standalone embedding query with all needed skills. candidateName is empty.

Return only the structured object.`;
}

/** The plan, by the hints when they decide, otherwise by the model; the hints or a plain search if the model fails. */
export async function resolveQueryPlan(
  question: string,
  history: readonly HistoryTurn[],
  prior: { ids: readonly string[]; names: readonly string[] },
  planner: QueryPlanner,
  signal?: AbortSignal,
): Promise<QueryPlan> {
  const heuristic = tryHeuristicQueryPlan(question, history, prior.ids);
  if (heuristic) return heuristic;
  try {
    const plan = await planner(plannerPrompt(question, history, prior.names), signal);
    const searchQuery = plan.searchQuery.trim() || question;
    if (plan.intent === "refine" && prior.ids.length === 0) return { ...search(searchQuery), candidateName: plan.candidateName.trim() };
    return { intent: plan.intent, searchQuery, candidateName: plan.candidateName.trim() };
  } catch (error) {
    if (signal?.aborted) throw error;
    return search(question);
  }
}

/** A person named after a lookup cue in the question: the last capitalised phrase, else the last name-like word. */
function inferLookupNameLoose(query: string): string | null {
  if (!LOOKUP_HINTS.test(query)) return null;
  const proper = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g);
  if (proper && proper.length > 0) return proper.at(-1) ?? null;
  return nameTokens(normalizeForMatch(query)).at(-1) ?? null;
}

/** A search the planner left as such, though the question names someone after a lookup cue, becomes a lookup. */
export function promoteLookupPlan(plan: QueryPlan, question: string): QueryPlan {
  if (plan.intent === "refine" || (plan.intent === "lookup" && plan.candidateName)) return plan;
  const name = plan.candidateName.trim() || inferLookupNameLoose(question);
  if (!name) return plan;
  return { intent: "lookup", searchQuery: plan.searchQuery || `CV profile of ${name}`, candidateName: name };
}
