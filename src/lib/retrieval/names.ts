// Name matching of the reference repo's retrieval (Minacava/cv-screener,
// lib/rag/name-match.ts): which CVs a lookup such as "Summarize Jane Doe's
// profile" is about.

/** Name words shorter than this don't identify anyone. */
const MIN_NAME_TOKEN_LEN = 3;

/** Lower case, accents off, `_` and `-` as spaces, only letters and digits kept. */
export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words of a name long enough to identify someone: "Nikolett Szabó" → ["nikolett", "szabo"]. */
export function nameTokens(value: string): string[] {
  return normalizeForMatch(value)
    .split(" ")
    .filter((token) => token.length >= MIN_NAME_TOKEN_LEN);
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * True when every word of `candidateName` is in the CV's full name; without a
 * name, when the query holds the full name or one of its words.
 */
export function candidateMatchesNameQuery(query: string, fullName: string, candidateName?: string | null): boolean {
  const nameParts = nameTokens(fullName);
  if (nameParts.length === 0) return false;

  const explicit = candidateName?.trim() ? nameTokens(candidateName) : [];
  if (explicit.length > 0) return explicit.every((token) => nameParts.includes(token));

  const normalizedQuery = normalizeForMatch(query);
  if (normalizedQuery.includes(normalizeForMatch(fullName))) return true;
  return nameParts.some((token) => new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:\\s|$)`).test(normalizedQuery));
}

/**
 * The CVs a lookup names; the other nearest neighbours go. Candidates who
 * share the name all stay.
 */
export function filterByCandidateName<T>(query: string, items: readonly T[], fullNameOf: (item: T) => string, candidateName?: string | null): T[] {
  return items.filter((item) => candidateMatchesNameQuery(query, fullNameOf(item), candidateName));
}
