import type { AnswerSource } from "@/contracts/ask";
import type { AnswerView, CandidateRow } from "@/contracts/view";
import { viewSources } from "@/lib/answering/views";
import { ANDREI, ELENA, LENA } from "@/lib/retrieval/fixtures";
import { findCandidate } from "./pool";

// Answers for the mocks and stories (PLAN, Design system: mocks), about
// candidates in MOCK_POOL, written the way the answer model is asked to: a
// short text beside the view that shows the candidates (DESIGN.md, Answer
// views). The CVs are the view's, as the server makes them.

export interface MockAnswer {
  text: string;
  view?: AnswerView;
  sources: AnswerSource[];
  checked: number;
}

/** A list row for a pool candidate, with the years of each skill asked about. */
function row(candidateId: string, skills: [string, number | null][] = [], note = "", page = 1): CandidateRow {
  const candidate = findCandidate(candidateId);
  if (!candidate) throw new Error(`${candidateId} is not in the mock pool`);
  const { name, headline } = candidate.profile;
  return { candidateId, name, headline, skills: skills.map(([skill, years]) => ({ skill, years })), note, page };
}

function answer(text: string, checked: number, view?: AnswerView): MockAnswer {
  return { text, view, sources: viewSources(view), checked };
}

export const ANSWERS = {
  filter: answer("**Jane Doe** also leads a frontend team.", 6, {
    kind: "list",
    ranked: false,
    skills: ["React", "TypeScript"],
    rows: [
      row("jane-doe", [["React", 8], ["TypeScript", 8]], "Frontend Lead at Emerald Paytech"),
      row("lena-novak", [["React", 7], ["TypeScript", 6]]),
      row("sofia-almeida", [["React", 7], ["TypeScript", 6]]),
      row("leon-fischer", [["React", 5], ["TypeScript", 5]], "React on a full-stack Node.js team"),
    ],
  }),
  followUp: answer("Two of them speak German.", 4, {
    kind: "list",
    ranked: false,
    skills: [],
    rows: [row("lena-novak", [], "German (native)", 2), row("leon-fischer", [], "German (C2)")],
  }),
  rank: answer("For a Frontend Lead role, leadership decides the order.", 6, {
    kind: "list",
    ranked: true,
    skills: [],
    rows: [
      row("jane-doe", [], "Already a Frontend Lead; mentors junior developers"),
      row("daan-de-vries", [], "Principal UI Engineer with the most frontend years"),
      row("lena-novak", [], "Senior; leads technical initiatives"),
    ],
  }),
  compare: answer("**Andrei Popescu** has more backend depth; **Elena Georgiou** works mostly in Java.", 2, {
    kind: "comparison",
    skills: ["Python"],
    candidates: [
      { candidateId: ANDREI.id, profile: ANDREI.profile, skills: [{ skill: "Python", years: 8 }], page: 1 },
      { candidateId: ELENA.id, profile: ELENA.profile, skills: [{ skill: "Python", years: 3 }], page: 1 },
    ],
  }),
  fact: answer("Since March 2022.", 1, {
    kind: "list",
    ranked: false,
    skills: [],
    rows: [row("lena-novak", [], "Senior Frontend Engineer at Kinetix Digital", 2)],
  }),
  profile: answer("**Lena Novak** is a senior frontend engineer who mentors junior developers.", 1, {
    kind: "profile",
    candidate: { candidateId: LENA.id, profile: LENA.profile, skills: [], page: 1 },
  }),
  count: answer("", 19, {
    kind: "list",
    ranked: false,
    skills: ["Python"],
    rows: [
      row("jonas-weber", [["Python", 10]]),
      row("petra-horvat", [["Python", 10]]),
      row("andrei-popescu", [["Python", 8]]),
      row("lucas-martin", [["Python", 7]]),
      row("ines-garcia", [["Python", 7]], "Machine learning pipelines in Python"),
      row("elena-georgiou", [["Python", 3]]),
    ],
  }),
  empty: answer("No candidate lists Rust.", 30, { kind: "status", status: "no-match" }),
  insufficient: answer("The CVs don't say what salary anyone expects.", 1, { kind: "status", status: "insufficient" }),
  help: answer(
    "I can search your 30 candidates' CVs for you: find people with a skill, rank them for a role, compare two, or pull a fact from one CV. Try **\"Who has React and TypeScript?\"**",
    0,
  ),
  outOfScope: answer("I can only help with your candidates' CVs. Try asking about skills, experience, languages or location.", 0, {
    kind: "status",
    status: "out-of-scope",
  }),
} as const satisfies Record<string, MockAnswer>;

/** An answer event that breaks the contract (neither text nor a view), for the client's validation. */
export const malformedAnswer = { text: "", sources: [], checked: 1 };
