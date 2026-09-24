// The word filter of the reference repo's retrieval (Minacava/cv-screener,
// lib/rag/constraint-filter.ts): the distinctive words of a query, and the CVs
// that contain every one of them. Same stopwords and matching.

/** Words that don't help match a CV skill or constraint. */
const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "at", "to", "for", "and", "or", "with", "who", "whom", "which", "that", "these",
  "those", "them", "they", "also", "from", "among", "know", "knows", "knowing", "have", "has", "had", "show", "find",
  "list", "candidates", "candidate", "cvs", "cv", "people", "person", "profile", "summary", "experience", "experienced",
  "skilled", "skill", "skills", "please", "me", "my", "de", "los", "las", "estos", "estas", "ellos", "ellas", "cuales",
  "cuáles", "quiénes", "quienes", "saben", "saber", "con", "que", "qué", "entre", "también", "tambien", "graduated",
  "graduate", "graduates", "graduation", "university", "universitat", "college", "school", "degree", "studied", "study",
  "studying", "bachelor", "master", "masters", "education", "edu", "alumni", "alumnus", "attended", "attending",
]);

/** Lower case, accents off, only letters, digits, `+`, `.` and `#` kept. */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9+.#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The words of a query that can pick out a CV: "of these who know AWS" gives
 * ["aws"], "Which candidate graduated from UPC?" gives ["upc"].
 */
export function constraintTokens(query: string): string[] {
  return [...new Set(normalizeText(query).split(" ").filter((token) => token.length >= 2 && !STOPWORDS.has(token)))];
}

function matchesAllTokens(text: string, tokens: readonly string[]): boolean {
  const haystack = normalizeText(text);
  return tokens.every((token) => haystack.includes(token));
}

/**
 * The previous answer's CVs that contain every word of the new constraint.
 * With no distinctive word, all of them: the model narrows them instead.
 */
export function filterByConstraint<T>(items: readonly T[], textOf: (item: T) => string, constraint: string): T[] {
  const tokens = constraintTokens(constraint);
  if (tokens.length === 0) return [...items];
  return items.filter((item) => matchesAllTokens(textOf(item), tokens));
}

/**
 * The CVs that contain every distinctive word of the query ("upc", "python"),
 * or null when there is no such word or no CV has them all, so the caller
 * falls back to the similarity scores.
 */
export function tryLexicalFilter<T>(items: readonly T[], textOf: (item: T) => string, query: string): T[] | null {
  const tokens = constraintTokens(query);
  if (items.length === 0 || tokens.length === 0) return null;
  const matched = items.filter((item) => matchesAllTokens(textOf(item), tokens));
  return matched.length > 0 ? matched : null;
}
