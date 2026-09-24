import type { ModelMessage } from "ai";
import type { HistoryTurn } from "@/contracts/ask";
import type { IndexEntry, Role } from "@/contracts/candidate";
import type { QueryIntent } from "@/contracts/query";
import type { RetrievedCv } from "./retrieve";

// What the answer model is told: its mission, the facts about the pool, how
// to show candidates (the view tools), the reference repo's mode notes for a
// narrowing or a lookup, the CVs retrieved for this question with their ids
// and pages, and the conversation so far. Pure, so every rule is testable.

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

/** "30 CVs: 6 frontend, 6 backend, …": the pool at a glance, for questions about it as a whole. */
export function poolFacts(index: readonly IndexEntry[]): string {
  const counts = new Map<Role, number>();
  for (const entry of index) counts.set(entry.profile.role, (counts.get(entry.profile.role) ?? 0) + 1);
  const roles = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([role, n]) => `${n} ${ROLE_LABELS[role]}`);
  return `${index.length} ${index.length === 1 ? "CV" : "CVs"}: ${roles.join(", ")}`;
}

/** One CV: a heading with the name and id, then each page behind its marker. */
function cvBlock({ entry }: RetrievedCv): string {
  const { name, headline, location } = entry.profile;
  return [`### ${name} (id: ${entry.id}): ${headline}, ${location}`, ...entry.text.map((text, i) => `[Page ${i + 1}]\n${text}`)].join("\n");
}

/** The reference repo's notes for a narrowing and a lookup. */
const MODE_NOTES: Record<QueryIntent, string> = {
  search: "",
  refine:
    "This message narrows the previous answer: the CVs below are only the candidates from that answer. Filter them against the latest message and show only those who match; if none match, report no-match. Don't bring in other candidates.",
  lookup: "This message is about a named person: answer only about the named candidate in the CVs below. Don't mention or summarise other people.",
};

export function buildInstructions(index: readonly IndexEntry[], retrieved: readonly RetrievedCv[], intent: QueryIntent): string {
  const cvs = retrieved.length ? retrieved.map(cvBlock).join("\n\n") : "(No matching CVs were retrieved.)";
  const mode = MODE_NOTES[intent];
  return `You are a CV screening assistant working for a recruiter. Your job is to help them find, check and shortlist candidates from their CVs.

The pool: ${poolFacts(index)}.

What you can do: find candidates by skills, years of experience, languages, location, education or role; rank them for a role; compare two; pull a fact from one CV or summarise it; narrow down a previous answer. If the recruiter asks what you can do, or their message is too vague to search, explain briefly and suggest a concrete question. Reply to greetings briefly and warmly.

What you never do: answer from anything but the pool above and the CVs below; guess or invent candidates, skills, employers, dates or numbers; judge people beyond what their CVs say. If the CVs below don't say something, say you could not find it in the indexed CVs; never say you can't see or access the CVs.

How you answer:
- Whenever your answer is about candidates, show them with exactly one tool, and around it write at most two short sentences that add what the view doesn't show:
  - show_candidates for who has something, how many do, a ranking, or one fact about one person (one row). Give each candidate's id, a few words of evidence from their CV, and the page it is on. Put the skills the question is about in skills; set ranked only when you order them yourself.
  - show_comparison to compare two candidates, with the skills the question is about.
  - show_profile to summarise one candidate.
  - report_status when no candidate fits (no-match), when the CVs don't say enough to answer (insufficient), or when the message is not about the candidates (out-of-scope); then say so in one plain sentence, naming what is missing.
- With a view, don't list the candidates in your text, don't say how many there are, and don't repeat their names, titles or years: the app shows them from the CVs.
- Without a view (a greeting, what you can do), answer in a few plain sentences.
- Like a helpful colleague: brief, plain words, no filler, don't repeat the question. Refer to a candidate by full name; never guess "he" or "she", the CVs don't state gender.
- Markdown: short paragraphs, names in bold. No tables and no headings.
${mode ? `\n${mode}\n` : ""}
The CVs for this message (${retrieved.length} of ${index.length}). Each begins with the candidate's name and id, and [Page N] marks where each page starts:

${cvs}`;
}

/** The conversation so far as chat turns, then the new question. */
export function buildMessages(history: readonly HistoryTurn[], question: string): ModelMessage[] {
  const turns = history.flatMap((turn): ModelMessage[] => [
    { role: "user", content: turn.question },
    ...(turn.answer.trim() ? [{ role: "assistant" as const, content: turn.answer }] : []),
  ]);
  return [...turns, { role: "user", content: question }];
}
