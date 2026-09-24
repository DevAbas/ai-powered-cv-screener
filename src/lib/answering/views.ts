import type { AnswerSource } from "@/contracts/ask";
import type { CandidateProfile, IndexEntry } from "@/contracts/candidate";
import type { AnswerView, CandidateRow, SkillYears, ViewCandidate } from "@/contracts/view";
import {
  MAX_VIEW_SKILLS,
  ReportStatusInputSchema,
  ShowCandidatesInputSchema,
  ShowComparisonInputSchema,
  ShowProfileInputSchema,
} from "@/contracts/view";
import type { StreamedToolCall } from "@/lib/ai/stream-text";
import { aliasKey, normalizeSkill } from "@/lib/pool/normalize";
import type { RetrievedCv } from "./retrieve";

// From the model's "show" call to the view the browser renders (DESIGN.md,
// Answer views). The model picks the view and the candidates; everything
// shown comes from the index: names, titles, skill years, the order and the
// count. Only retrieved candidates can appear, and a call that names none of
// them gives no view.

/** The skills asked about, in their canonical names, without repeats. */
function viewSkills(skills: readonly string[]): string[] {
  const names = skills.map((skill) => normalizeSkill(skill)).filter(Boolean);
  return [...new Map(names.map((name) => [aliasKey(name), name])).values()].slice(0, MAX_VIEW_SKILLS);
}

/** Each asked skill with its years on this CV; null when the CV doesn't list it or gives no years. */
export function skillYears(profile: CandidateProfile, skills: readonly string[]): SkillYears[] {
  return skills.map((skill) => {
    const found = profile.skills.find((s) => aliasKey(normalizeSkill(s.name)) === aliasKey(skill));
    return { skill, years: found?.years ?? null };
  });
}

/** A cited page that exists on the CV, otherwise the first. */
function validPage(page: number, entry: IndexEntry): number {
  return Number.isInteger(page) && page >= 1 && page <= entry.pages ? page : 1;
}

/** Unsorted rows keep the model's order; otherwise the most years of the first skill come first, unknown years last. */
function byFirstSkill(a: CandidateRow, b: CandidateRow): number {
  const ya = a.skills[0]?.years ?? -1;
  const yb = b.skills[0]?.years ?? -1;
  return yb - ya;
}

/** The view a "show" call asks for; its input is checked again against the contract. */
export function buildView(call: StreamedToolCall, retrieved: readonly RetrievedCv[]): AnswerView | undefined {
  const byId = new Map(retrieved.map((cv) => [cv.entry.id, cv.entry]));
  const candidate = (id: string, skills: readonly string[] = []): ViewCandidate | undefined => {
    const entry = byId.get(id);
    return entry ? { candidateId: entry.id, profile: entry.profile, skills: skillYears(entry.profile, skills), page: 1 } : undefined;
  };

  switch (call.toolName) {
    case "show_candidates": {
      const input = ShowCandidatesInputSchema.safeParse(call.input);
      if (!input.success) return undefined;
      const skills = viewSkills(input.data.skills);
      const seen = new Set<string>();
      const rows = input.data.candidates.flatMap((c): CandidateRow[] => {
        const entry = byId.get(c.id);
        if (!entry || seen.has(entry.id)) return [];
        seen.add(entry.id);
        const { name, headline } = entry.profile;
        return [{ candidateId: entry.id, name, headline, skills: skillYears(entry.profile, skills), note: c.note.trim(), page: validPage(c.page, entry) }];
      });
      if (rows.length === 0) return undefined;
      const ranked = input.data.ranked;
      return { kind: "list", ranked, skills, rows: ranked || skills.length === 0 ? rows : [...rows].sort(byFirstSkill) };
    }
    case "show_comparison": {
      const input = ShowComparisonInputSchema.safeParse(call.input);
      if (!input.success) return undefined;
      const skills = viewSkills(input.data.skills);
      const [a, b] = input.data.ids.map((id) => candidate(id, skills));
      if (!a || !b || a.candidateId === b.candidateId) return undefined;
      return { kind: "comparison", skills, candidates: [a, b] };
    }
    case "show_profile": {
      const input = ShowProfileInputSchema.safeParse(call.input);
      const one = input.success ? candidate(input.data.id) : undefined;
      return one ? { kind: "profile", candidate: one } : undefined;
    }
    case "report_status": {
      const input = ReportStatusInputSchema.safeParse(call.input);
      return input.success ? { kind: "status", status: input.data.status } : undefined;
    }
    default:
      return undefined;
  }
}

/** The CVs a view shows, as the answer's sources. */
export function viewSources(view: AnswerView | undefined): AnswerSource[] {
  if (!view) return [];
  switch (view.kind) {
    case "list":
      return view.rows.map((row) => ({ candidateId: row.candidateId, name: row.name, page: row.page }));
    case "comparison":
      return view.candidates.map((c) => ({ candidateId: c.candidateId, name: c.profile.name, page: c.page }));
    case "profile":
      return [{ candidateId: view.candidate.candidateId, name: view.candidate.profile.name, page: view.candidate.page }];
    case "status":
      return [];
  }
}
