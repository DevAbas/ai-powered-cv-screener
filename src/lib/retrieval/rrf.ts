// Reciprocal rank fusion (Cormack, Clarke and Büttcher, SIGIR 2009): each
// ranked list contributes 1 / (k + rank) per item, k = 60 as in the paper.

/** The constant of the paper; PLAN records it as the starting value. */
export const RRF_K = 60;

export interface Fused {
  id: string;
  score: number;
}

/** Ids of every list, ordered by their fused score, ties by id. */
export function reciprocalRankFusion(lists: readonly (readonly string[])[], k = RRF_K): Fused[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...scores]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
