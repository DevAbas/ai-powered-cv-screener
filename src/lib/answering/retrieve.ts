import type { IndexEntry } from "@/contracts/candidate";
import type { QueryPlan } from "@/contracts/query";
import { cosineSimilarity } from "ai";
import type { Embedder } from "@/lib/ai/embedder";
import { pageTexts } from "@/lib/pool/chunks";
import { filterByCandidateName } from "@/lib/retrieval/names";
import type { VectorStore } from "@/lib/vector/vector-store";
import type { RetrievalConfig } from "./config";
import { filterByConstraint, tryLexicalFilter } from "./filter";

// The CVs a question is answered from, as the reference repo retrieves them
// (Minacava/cv-screener, app/api/chat/route.ts): the planned query is
// embedded, then
// - lookup: the nearest CVs whose name matches the planned name;
// - search: the CVs holding every distinctive word of the query, otherwise
//   those scoring at least `minScore` when the best reaches `minTopScore`;
// - refine: the previous answer's CVs, ranked by similarity and kept when
//   they hold every distinctive word of the latest message.
// Two fallbacks go past the reference, each taken from its own search path:
// a named lookup that matches nobody ("Summarize Jane Doe's profile" reads as
// the name "Summarize Jane Doe") retries with the names in the question, and
// a narrowing whose words no CV holds ("speak German") keeps the previous
// answer's CVs for the model to filter, as a search with no word hits does.

export interface RetrievedCv {
  entry: IndexEntry;
  /** Similarity to the planned query. */
  score: number;
}

export interface RetrieveDeps {
  index: readonly IndexEntry[];
  embedder: Embedder;
  store: VectorStore;
}

const cvText = (cv: RetrievedCv) => pageTexts(cv.entry).join("\n");
const cvName = (cv: RetrievedCv) => cv.entry.profile.name;

/** Off-topic or weak matches dropped: nothing when even the best is weak. */
export function filterRelevantMatches(matches: readonly RetrievedCv[], config: Pick<RetrievalConfig, "minTopScore" | "minScore">): RetrievedCv[] {
  const top = matches[0]?.score ?? 0;
  if (top < config.minTopScore) return [];
  return matches.filter((match) => match.score >= config.minScore);
}

export async function retrieve(
  plan: QueryPlan,
  question: string,
  priorIds: readonly string[],
  deps: RetrieveDeps,
  config: RetrievalConfig,
  signal?: AbortSignal,
): Promise<RetrievedCv[]> {
  const byId = new Map(deps.index.map((entry) => [entry.id, entry]));
  const vector = await deps.embedder.embedQuery(plan.searchQuery, signal);

  if (plan.intent === "refine" && priorIds.length > 0) {
    const values = await deps.store.fetch(priorIds);
    const ranked = priorIds
      .flatMap((id): RetrievedCv[] => {
        const entry = byId.get(id);
        const stored = values.get(id);
        if (!entry) return [];
        return [{ entry, score: stored && stored.length === vector.length ? cosineSimilarity(vector, stored) : 0 }];
      })
      .sort((a, b) => b.score - a.score);
    const narrowed = filterByConstraint(ranked, cvText, question);
    return narrowed.length > 0 ? narrowed : ranked;
  }

  const scored = (await deps.store.query(vector, config.topK, undefined, signal)).flatMap((match): RetrievedCv[] => {
    const entry = byId.get(match.id);
    return entry ? [{ entry, score: match.score }] : [];
  });

  if (plan.intent === "lookup") {
    const named = filterByCandidateName(plan.searchQuery, scored, cvName, plan.candidateName);
    return named.length > 0 ? named : filterByCandidateName(plan.candidateName || plan.searchQuery, scored, cvName, null);
  }

  return tryLexicalFilter(scored, cvText, plan.searchQuery) ?? filterRelevantMatches(scored, config);
}
