import type { ModelMessage } from "ai";
import type { HistoryTurn } from "@/contracts/ask";
import type { IndexEntry, Role } from "@/contracts/candidate";

// What the answer model is told (PLAN, Retrieval and answering: mission
// prompt): its job and tone, the pool at a glance, the candidate directory
// so names map to ids, what each tool is for, how to end with `present`,
// and the conversation so far. No CV text: the tools return what is needed.

const ROLE_LABELS: Record<Role, string> = {
  frontend: "frontend",
  backend: "backend",
  fullstack: "full-stack",
  mobile: "mobile",
  data: "data",
  devops: "DevOps",
  qa: "QA",
  security: "security",
  product: "product",
  other: "other",
};

/** "30 CVs: 6 frontend, 6 backend, …": the pool at a glance. */
export function poolFacts(entries: readonly IndexEntry[]): string {
  const counts = new Map<Role, number>();
  for (const entry of entries) counts.set(entry.profile.role, (counts.get(entry.profile.role) ?? 0) + 1);
  const roles = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([role, n]) => `${n} ${ROLE_LABELS[role]}`);
  return `${entries.length} ${entries.length === 1 ? "CV" : "CVs"}: ${roles.join(", ")}`;
}

/** One line per candidate: id, name, headline; a shared name is marked so the model asks which one. */
export function candidateDirectory(entries: readonly IndexEntry[]): string {
  const byName = new Map<string, number>();
  for (const entry of entries) byName.set(entry.profile.name, (byName.get(entry.profile.name) ?? 0) + 1);
  return entries
    .map((entry) => {
      const shared = (byName.get(entry.profile.name) ?? 0) > 1 ? " (another candidate has this name)" : "";
      return `${entry.id} — ${entry.profile.name} — ${entry.profile.headline}${shared}`;
    })
    .join("\n");
}

export function buildInstructions(entries: readonly IndexEntry[], previousIds: readonly string[]): string {
  const previous = previousIds.length > 0 ? `The previous answer showed ${previousIds.length} candidate(s): ${previousIds.join(", ")}. A follow-up that narrows them ("of those", "and who also…") uses scope previous_answer.` : "There is no previous answer to narrow.";
  return `You are a CV screening assistant working for a recruiter. You help them find, check and shortlist candidates from the CVs in their pool.

The pool: ${poolFacts(entries)}.

The candidates (id — name — headline). Refer to a candidate by id in every tool call; when a question names someone, find them here. If two candidates share the name asked about, ask which one is meant instead of guessing.
${candidateDirectory(entries)}

How you work:
- Exact questions run as tools over the candidates' profiles: find_candidates for who matches criteria (skills and their years, languages and levels, role, seniority, location, education, employers, industries, certifications, notice period, work mode, leadership, job stability), count_candidates for how many (the only source of a count), get_candidates for a comparison, a profile summary or one fact about named candidates, and find_candidates with empty filters to list every candidate.
- search_cv_text finds what criteria cannot express: a kind of work, a project, a phrase.
- Map the question's words to the tools' values: an acronym or a short form stands for the full name in the list ("UPC" for the university whose full name it abbreviates; "postgres" for PostgreSQL). If a tool rejects a value, choose one from its list or report that the pool has no such value.
- "5+ years" means at least 5 (gte 5); "under 2 years" means below 2 (lt 2). "Speaks German" means any level unless a level is asked. To rank, filter first, then order the matches yourself with a reason each.
- Put every criterion of the question into one find_candidates call: the app lists every match the tool returns, so never narrow the matches yourself or present a hand-picked part of them.
- ${previous}
- Use at most a few tool calls, then answer. Never answer a question about the candidates from memory.

How you end:
- Whenever your answer is about candidates, finish with exactly one call to present in the same message as your answer text: the view, the candidates by id, each with the page the tool result cites, and a short reason each for a ranking only; the skills the question is about, so their years are shown. Text alone is not a finished answer once a tool has returned candidates: the view carries their CVs and sources.
- The view answers the question and no more: profile when the answer is one candidate (a named one, or the one candidate the question's criteria match); list when it is several; ranked for the best or the top; comparison for a comparison; count for "how many".
- Nothing matched: present no_match. The CVs don't say enough (a fact no CV contains, such as salary): present not_enough_information. Not about the candidates: present out_of_scope. Each with no candidates.
- A greeting, or a question about what you can do: answer in a sentence or two, no tools, no present.

How you write:
- Plain, warm and brief, like a helpful colleague. Don't repeat the question.
- For a list, a count or a comparison, the app opens the answer with its own sentence and draws the candidates, their titles, counts and years from the CVs: write nothing, or only what the view cannot show. Never list candidates in your text, never state a count, never add a candidate or a fact the tools didn't return.
- For a profile, write two or three sentences on what was asked: a summary when a summary was asked, otherwise the experience, degree or employer the question is about. The app adds the name, the title and the CV. Never announce the presentation ("Presenting…"): call it.
- For a ranking, one sentence on what decided the order; for a fact, the fact in one sentence.
- After a no match or an out-of-scope question, offer one helpful next question the recruiter could ask, ending with a question mark.
- Refer to a candidate by full name; never guess "he" or "she", the CVs don't state gender.
- Tool calls are calls, never text: no JSON and no tool syntax in the answer.
- Markdown: short paragraphs; names in bold. No headings, tables or links.`;
}

/** The conversation so far as chat turns, then the new question. */
export function buildMessages(history: readonly HistoryTurn[], question: string): ModelMessage[] {
  const turns = history.flatMap((turn): ModelMessage[] => [
    { role: "user", content: turn.question },
    ...(turn.answer.trim() ? [{ role: "assistant" as const, content: turn.answer }] : []),
  ]);
  return [...turns, { role: "user", content: question }];
}
