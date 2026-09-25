import type { AnswerSource } from "@/contracts/ask";
import type { CandidateProfile, IndexEntry } from "@/contracts/candidate";
import type { PresentInput } from "@/contracts/tools";
import type { AnswerStatus, AnswerView, CandidateRow, SkillYears, ViewCandidate } from "@/contracts/view";
import { leadSentence, searchLead } from "./describe";
import type { ResultStore } from "./results";

// From the model's presentation call to the view the browser renders (PLAN,
// Retrieval and answering: presentation and views). The call is checked
// against the tool results: a candidate no tool returned fails the answer,
// a page the tools did not cite for that candidate is corrected to one they
// did. Every fact shown comes from the index; the sources come only from
// the call; the opening sentence of a filter, count, list or no match is
// composed from the last filter call and its result (describe.ts), so its
// count and criteria are the tools'. A list after an exact filter holds
// every candidate the filter matched (PRD: complete lists), so the model
// can neither drop a match nor add one; and one candidate, however the
// model presented them, is shown as their profile: the text answers, the
// view shows who and their CV.

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
  // A reason belongs to a ranking; a plain list shows the facts and nothing the model retyped.
  const ranked = present.view === "ranked";
  const asRow = (c: (typeof candidates)[number]): CandidateRow => ({
    candidateId: c.id,
    name: c.entry.profile.name,
    headline: c.entry.profile.headline,
    skills: skillYears(c.entry.profile, skills),
    reason: ranked ? c.reason : "",
    page: c.page,
  });
  /** The opening sentence from the last filter call, or from the text search when that produced the list. */
  const lead = (rowsShown: boolean, counted: boolean): string => {
    const filter = store.lastFilter;
    if (filter) {
      const matched = filter.tool === "find_candidates" ? filter.result.matched : filter.result.count;
      const scope = filter.input.scope;
      return leadSentence({ filters: filter.input.filters, matched, total: scope === "previous_answer" ? store.previousCount : filter.result.total, scope, rowsShown, counted });
    }
    if (store.lastSearch) return searchLead(store.lastSearch.result.length, rowsShown);
    return "";
  };
  const asCandidate = (c: (typeof candidates)[number]): ViewCandidate => ({ candidateId: c.id, profile: c.entry.profile, skills: skillYears(c.entry.profile, skills), page: c.page });
  const profileOf = (c: Candidate, lead: string): BuiltView => ({ view: { kind: "profile", candidate: asCandidate(c), lead }, sources: [sourceOf(c)], corrections });
  type Candidate = (typeof candidates)[number];
  const sourceOf = (c: Candidate): AnswerSource => ({ candidateId: c.id, name: c.entry.profile.name, page: c.page });
  const sources = candidates.map(sourceOf);
  // The app's order: the order the tools returned the candidates in.
  const toolOrder = [...candidates].sort((a, b) => store.knownIds.indexOf(a.id) - store.knownIds.indexOf(b.id));
  /** Every candidate the last filter matched, in its order, with the page the model cited where it named one. */
  const completeList = (): Candidate[] => {
    const find = store.lastFind;
    if (!find || find.result.candidates.length === 0) return toolOrder;
    const presented = new Map(candidates.map((c) => [c.id, c]));
    const rows = find.result.candidates.map((match) => presented.get(match.id) ?? { id: match.id, page: store.citedPages(match.id)[0] ?? 1, reason: "", entry: byId.get(match.id)! });
    const added = rows.filter((row) => !presented.has(row.id)).length;
    const leftOut = candidates.filter((c) => !rows.some((row) => row.id === c.id)).length;
    if (added > 0) corrections.push(`${added} matched candidate(s) the presentation left out were added to the list`);
    if (leftOut > 0) corrections.push(`${leftOut} presented candidate(s) outside the filter's matches were left out of the list`);
    return rows;
  };

  if (isState) {
    const status = STATUS_OF[present.view as keyof typeof STATUS_OF];
    const filter = store.lastFilter;
    const noMatch = present.view === "no_match" && filter !== undefined && (filter.tool === "find_candidates" ? filter.result.matched : filter.result.count) === 0;
    return { view: { kind: "status", status, lead: noMatch ? lead(false, false) : "" }, sources, corrections };
  }

  switch (present.view) {
    case "list": {
      if (candidates.length === 0) throw new PresentationError("A list needs at least one candidate from the tool results");
      const rows = completeList();
      // One candidate is a profile, opened by the app's sentence when the model wrote none.
      if (rows.length === 1) return profileOf(rows[0]!, lead(true, false));
      return { view: { kind: "list", lead: lead(true, false), ranked: false, skills, rows: rows.map(asRow) }, sources: rows.map(sourceOf), corrections };
    }
    case "ranked":
      if (candidates.length === 0) throw new PresentationError("A ranking needs at least one candidate from the tool results");
      return { view: { kind: "list", lead: "", ranked: true, skills, rows: candidates.map(asRow) }, sources, corrections };
    case "count": {
      const count = store.exactCount;
      if (!count) throw new PresentationError("A count needs count_candidates to have run");
      // Rows only when the model listed any; then all of the filter's matches.
      const rows = candidates.length > 0 ? completeList() : [];
      return {
        view: { kind: "list", lead: lead(rows.length > 0, true), ranked: false, skills, rows: rows.map(asRow), count: { matched: count.count, total: count.total } },
        sources: rows.map(sourceOf),
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
      // The app's sentence fits only when the search itself found this one candidate.
      const filter = store.lastFilter;
      const matchedOne = filter ? (filter.tool === "find_candidates" ? filter.result.matched : filter.result.count) === 1 : store.lastSearch?.result.length === 1;
      return profileOf(candidates[0]!, matchedOne ? lead(true, false) : "");
    }
  }
  throw new PresentationError(`Unknown view ${present.view}`);
}
