import type { AnsweredBy, AnswerMatched, AnswerSource } from "@/contracts/ask";
import type { AnswerView, CandidateRow } from "@/contracts/view";
import { ANDREI, ELENA, LENA } from "@/lib/retrieval/fixtures";
import { findCandidate } from "./pool";

// Answers for the mocks and stories (PLAN, Design system: mocks), about
// candidates in MOCK_POOL, written the way the answer model is asked to: a
// short text beside the view that shows the candidates (DESIGN.md, Answer
// views). The sources are the view's, as the server makes them.

export interface MockAnswer {
  text: string;
  view?: AnswerView;
  sources: AnswerSource[];
  matched: AnswerMatched | null;
  answeredBy: AnsweredBy;
}

const PRIMARY: AnsweredBy = { model: "primary", name: "Gemini Flash-Lite", fellBack: false };
/** The settled line when a fallback answered (DESIGN.md, Progress line); no entry has one in this phase. */
const FALLBACK: AnsweredBy = { model: "primary", name: "Nemotron 3 Super", fellBack: true };

/** A list row for a pool candidate, with the years of each skill asked about. */
function row(candidateId: string, skills: [string, number | null][] = [], reason = "", page = 1): CandidateRow {
  const candidate = findCandidate(candidateId);
  if (!candidate) throw new Error(`${candidateId} is not in the mock pool`);
  const { name, headline } = candidate.profile;
  return { candidateId, name, headline, skills: skills.map(([skill, years]) => ({ skill, years })), reason, page };
}

/** The CVs a view shows, as the answer's sources. */
export function sourcesOf(view: AnswerView | undefined): AnswerSource[] {
  if (!view) return [];
  switch (view.kind) {
    case "list":
      return view.rows.map((r) => ({ candidateId: r.candidateId, name: r.name, page: r.page }));
    case "comparison":
      return view.candidates.map((c) => ({ candidateId: c.candidateId, name: c.profile.name, page: c.page }));
    case "profile":
      return [{ candidateId: view.candidate.candidateId, name: view.candidate.profile.name, page: view.candidate.page }];
    case "status":
      return [];
  }
}

function answer(text: string, matched: AnswerMatched | null, view?: AnswerView, answeredBy: AnsweredBy = PRIMARY): MockAnswer {
  return { text, view, sources: sourcesOf(view), matched, answeredBy };
}

const matched = (count: number, total = 30): AnswerMatched => ({ kind: "matched", count, total });

const filterView: AnswerView = {
  kind: "list",
  lead: "There are 4 candidates with React and TypeScript experience. Here are their details.",
  ranked: false,
  skills: ["React", "TypeScript"],
  rows: [
    row("jane-doe", [["React", 8], ["TypeScript", 8]]),
    row("lena-novak", [["React", 7], ["TypeScript", 6]]),
    row("sofia-almeida", [["React", 7], ["TypeScript", 6]]),
    row("leon-fischer", [["React", 5], ["TypeScript", 5]]),
  ],
};

export const ANSWERS = {
  filter: answer("", matched(4), filterView),
  followUp: answer("", matched(2, 4), {
    kind: "list",
    lead: "Of the previous 4 candidates, there are 2 who speak German. Here are their details.",
    ranked: false,
    skills: [],
    rows: [row("lena-novak", [], "", 2), row("leon-fischer")],
  }),
  rank: answer("For a Frontend Lead role, leadership decides the order.", matched(6), {
    kind: "list",
    lead: "",
    ranked: true,
    skills: [],
    rows: [
      row("jane-doe", [], "Already a Frontend Lead; mentors junior developers"),
      row("daan-de-vries", [], "Principal UI Engineer with the most frontend years"),
      row("lena-novak", [], "Senior; leads technical initiatives"),
    ],
  }),
  compare: answer("**Andrei Popescu** has more backend depth; **Elena Georgiou** works mostly in Java.", { kind: "read", count: 2, total: 2 }, {
    kind: "comparison",
    skills: ["Python"],
    candidates: [
      { candidateId: ANDREI.id, profile: ANDREI.profile, skills: [{ skill: "Python", years: 8 }], page: 1 },
      { candidateId: ELENA.id, profile: ELENA.profile, skills: [{ skill: "Python", years: 3 }], page: 1 },
    ],
  }),
  fact: answer("**Lena Novak** has worked at Kinetix Digital since March 2022.", { kind: "read", count: 1, total: 1 }, {
    kind: "profile",
    candidate: { candidateId: LENA.id, profile: LENA.profile, skills: [], page: 2 },
    lead: "",
  }),
  profile: answer("**Lena Novak** is a senior frontend engineer who mentors junior developers.", { kind: "read", count: 1, total: 1 }, {
    kind: "profile",
    candidate: { candidateId: LENA.id, profile: LENA.profile, skills: [], page: 1 },
    lead: "",
  }),
  count: answer("", matched(6), {
    kind: "list",
    lead: "Out of 30 candidates, there are 6 with Python experience. Here are their details.",
    ranked: false,
    skills: ["Python"],
    count: { matched: 6, total: 30 },
    rows: [
      row("jonas-weber", [["Python", 10]]),
      row("petra-horvat", [["Python", 10]]),
      row("andrei-popescu", [["Python", 8]]),
      row("lucas-martin", [["Python", 7]]),
      row("ines-garcia", [["Python", 7]]),
      row("elena-georgiou", [["Python", 3]]),
    ],
  }),
  countOnly: answer("", matched(19), { kind: "list", lead: "Out of 30 candidates, there are 19 with Python experience.", ranked: false, skills: ["Python"], count: { matched: 19, total: 30 }, rows: [] }),
  empty: answer("Would Go or C++ experience help?", matched(0), { kind: "status", status: "no-match", lead: "There are no candidates with Rust experience." }),
  insufficient: answer("The CVs don't say what salary anyone expects.", { kind: "read", count: 1, total: 1 }, { kind: "status", status: "insufficient", lead: "" }),
  help: answer(
    "I can search your 30 candidates' CVs for you: find people with a skill, rank them for a role, compare two, or pull a fact from one CV. Try **\"Who has React and TypeScript?\"**",
    null,
  ),
  outOfScope: answer("I can only help with your candidates' CVs. Who would you like to look at first?", null, { kind: "status", status: "out-of-scope", lead: "" }),
  /** The same filter answer, from the fallback model. */
  fallback: answer("", matched(4), filterView, FALLBACK),
} as const satisfies Record<string, MockAnswer>;

/** An answer event that breaks the contract (neither text nor a view), for the client's validation. */
export const malformedAnswer = { text: "", sources: [], matched: null, answeredBy: PRIMARY };
