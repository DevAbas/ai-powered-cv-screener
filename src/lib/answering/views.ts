import type { AnswerSource } from "@/contracts/ask";
import type { CandidateProfile, IndexEntry } from "@/contracts/candidate";
import type { PresentInput } from "@/contracts/tools";
import type { AnswerStatus, AnswerView, CandidateRow, SkillYears, ViewCandidate } from "@/contracts/view";
import type { ResultStore } from "./results";

// From the model's presentation call to the view the browser renders (PLAN,
// Retrieval and answering: presentation and views). The call is checked
// against the tool results: a candidate no tool returned fails the answer,
// a page the tools did not cite for that candidate is corrected to one they
// did. Every fact shown comes from the index; the sources come only from
// the call.

export interface BuiltView {
  view: AnswerView;
  sources: AnswerSource[];
  /** What was corrected, for the log. */
  corrections: string[];
}

/** The presentation named candidates the tools never returned: the one way left to invent one. */
export class UnverifiedAnswerError extends Error {
  constructor(readonly ids: readonly string[]) {
    super(`The answer named candidates no tool returned: ${ids.join(", ")}`);
    this.name = "UnverifiedAnswerError";
  }
}

/** The presentation asked for a view its results cannot fill. */
export class PresentationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PresentationError";
  }
}

const STATUS_OF: Record<"no_match" | "not_enough_information" | "out_of_scope", AnswerStatus> = {
  no_match: "no-match",
  not_enough_information: "insufficient",
  out_of_scope: "out-of-scope",
};

/** Each asked skill with its years on this CV; null when the CV doesn't list it or gives no years. */
export function skillYears(profile: CandidateProfile, skills: readonly string[]): SkillYears[] {
  return skills.map((skill) => ({ skill, years: profile.skills.find((s) => s.name === skill)?.years ?? null }));
}

export function buildView(present: PresentInput, store: ResultStore, byId: ReadonlyMap<string, IndexEntry>): BuiltView {
  const corrections: string[] = [];
  const isState = present.view === "no_match" || present.view === "not_enough_information" || present.view === "out_of_scope";

  // Candidates: known to the tools, once each; a state carries none (except what it lacks information about).
  const named = present.view === "no_match" || present.view === "out_of_scope" ? [] : present.candidates;
  if (named.length < present.candidates.length) corrections.push(`${present.candidates.length - named.length} candidate(s) dropped from a ${present.view} state`);
  const unknown = named.filter((c) => !store.knows(c.id) || !byId.has(c.id)).map((c) => c.id);
  if (unknown.length) throw new UnverifiedAnswerError([...new Set(unknown)]);
  const seen = new Set<string>();
  const candidates = named
    .filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)))
    .map((c) => {
      const cited = store.citedPages(c.id);
      const page = cited.includes(c.page) ? c.page : (cited[0] ?? 1);
      if (page !== c.page) corrections.push(`${c.id}: page ${c.page} corrected to ${page}`);
      return { id: c.id, page, reason: c.reason.trim(), entry: byId.get(c.id)! };
    });
  const skills = [...new Set(present.skills)];
  const asRow = (c: (typeof candidates)[number]): CandidateRow => ({
    candidateId: c.id,
    name: c.entry.profile.name,
    headline: c.entry.profile.headline,
    skills: skillYears(c.entry.profile, skills),
    reason: c.reason,
    page: c.page,
  });
  const asCandidate = (c: (typeof candidates)[number]): ViewCandidate => ({ candidateId: c.id, profile: c.entry.profile, skills: skillYears(c.entry.profile, skills), page: c.page });
  const sources = candidates.map((c) => ({ candidateId: c.id, name: c.entry.profile.name, page: c.page }));
  // The app's order: the order the tools returned the candidates in.
  const toolOrder = [...candidates].sort((a, b) => store.knownIds.indexOf(a.id) - store.knownIds.indexOf(b.id));

  if (isState) return { view: { kind: "status", status: STATUS_OF[present.view as keyof typeof STATUS_OF] }, sources, corrections };

  switch (present.view) {
    case "list":
      if (candidates.length === 0) throw new PresentationError("A list needs at least one candidate from the tool results");
      return { view: { kind: "list", ranked: false, skills, rows: toolOrder.map(asRow) }, sources: toolOrder.map((c) => sources.find((s) => s.candidateId === c.id)!), corrections };
    case "ranked":
      if (candidates.length === 0) throw new PresentationError("A ranking needs at least one candidate from the tool results");
      return { view: { kind: "list", ranked: true, skills, rows: candidates.map(asRow) }, sources, corrections };
    case "count": {
      const count = store.exactCount;
      if (!count) throw new PresentationError("A count needs count_candidates to have run");
      return {
        view: { kind: "list", ranked: false, skills, rows: toolOrder.map(asRow), count: { matched: count.count, total: count.total } },
        sources: toolOrder.map((c) => sources.find((s) => s.candidateId === c.id)!),
        corrections,
      };
    }
    case "comparison": {
      if (candidates.length !== 2) throw new PresentationError(`A comparison needs exactly two candidates, not ${candidates.length}`);
      const [a, b] = candidates;
      return { view: { kind: "comparison", skills, candidates: [asCandidate(a!), asCandidate(b!)] }, sources, corrections };
    }
    case "profile": {
      if (candidates.length !== 1) throw new PresentationError(`A profile needs exactly one candidate, not ${candidates.length}`);
      return { view: { kind: "profile", candidate: asCandidate(candidates[0]!) }, sources, corrections };
    }
  }
  throw new PresentationError(`Unknown view ${present.view}`);
}
