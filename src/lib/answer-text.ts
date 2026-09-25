import type { CandidateProfile, Degree, LanguageLevel, WorkMode } from "@/contracts/candidate";
import type { AnswerStatus, AnswerView, SkillYears } from "@/contracts/view";

// An answer and its view in words (DESIGN.md, Answer views): the list
// caption, the facts each view shows, and the whole answer as plain text, the
// context a follow-up question is asked in. The components and the plain
// text share these, so they always agree.

type ListView = Extract<AnswerView, { kind: "list" }>;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Python 10 yrs", "Go 1 yr", or "Rust —" when the CV gives no years. */
export function skillLabel({ skill, years }: SkillYears): string {
  return years === null ? `${skill} —` : `${skill} ${years} ${years === 1 ? "yr" : "yrs"}`;
}

/** The opening line of a list: the app's sentence, or the count of rows for a ranking. */
export function listCaption(view: ListView): string | undefined {
  if (view.lead) return view.lead;
  if (view.ranked && view.rows.length > 1) return `${plural(view.rows.length, "candidate")} · best fit first`;
  return undefined;
}

/** What a state says when the model wrote nothing. */
export function statusText(status: AnswerStatus, lead = ""): string {
  if (lead) return lead;
  switch (status) {
    case "no-match":
      return "No candidate matches this.";
    case "insufficient":
      return "The CVs don't say enough to answer this.";
    case "out-of-scope":
      return "That isn't about the candidates. Ask about their skills, experience, languages or education.";
  }
}

const DEGREES: Record<Degree, string> = {
  associate: "Associate degree",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
  other: "Degree",
};

const WORK_MODES: Record<WorkMode, string> = { onsite: "on-site", hybrid: "hybrid", remote: "remote", relocation: "open to relocation" };

const levelLabel = (level: LanguageLevel) => (level === "native" ? "native" : level);
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const year = (month: string | null) => (month ? month.slice(0, 4) : "now");

/** The facts of a profile, one line each, as the profile and the comparison show them. */
export const profileFacts = {
  summary: (p: CandidateProfile) => `${p.headline} · ${p.location} · ${plural(p.yearsTotal, "year")} of experience`,
  seniority: (p: CandidateProfile) => `${capitalise(p.seniority)} · ${plural(p.yearsTotal, "year")}`,
  skills: (p: CandidateProfile, max = 8) =>
    [...p.skills]
      .sort((a, b) => (b.years ?? -1) - (a.years ?? -1))
      .slice(0, max)
      .map((s) => skillLabel({ skill: s.name, years: s.years ?? null }))
      .join(" · "),
  languages: (p: CandidateProfile) => p.languages.map((l) => `${l.language} (${levelLabel(l.level)})`).join(" · "),
  education: (p: CandidateProfile) => p.education.map((e) => `${DEGREES[e.degree]} in ${e.field}, ${e.institution}, ${e.year}`).join(" · "),
  experience: (p: CandidateProfile, max = 2) =>
    p.employment
      .slice(0, max)
      .map((e) => `${e.title}, ${e.company}, ${year(e.from)}–${year(e.to)}`)
      .join(" · "),
  notice: (p: CandidateProfile) => (p.availability === 0 ? "Immediately" : plural(p.availability, "day")),
  work: (p: CandidateProfile) => capitalise(p.remote.map((mode) => WORK_MODES[mode]).join(", ")),
};

/** A view as plain lines, each CV with the page its file card opens. */
export function viewLines(view: AnswerView): string[] {
  switch (view.kind) {
    case "list": {
      const caption = listCaption(view);
      const rows = view.rows.map((row, i) => {
        const parts = [row.name, row.headline, ...row.skills.map(skillLabel), row.reason].filter(Boolean);
        return `${view.ranked ? `${i + 1}.` : "-"} ${parts.join(" — ")} (CV p. ${row.page})`;
      });
      return caption ? [caption, ...rows] : rows;
    }
    case "comparison":
      return view.candidates.map(({ profile, skills, page }) => `- ${[profile.name, profile.headline, profile.location, ...skills.map(skillLabel)].join(" — ")} (CV p. ${page})`);
    case "profile": {
      const { profile, page } = view.candidate;
      return [`${profile.name} — ${profileFacts.summary(profile)} (CV p. ${page})`];
    }
    case "status":
      return view.lead ? [view.lead] : [];
  }
}

/** The app's words when the model wrote none: a state's line, or the sentence that opens a profile. */
function fallbackText(view: AnswerView | undefined): string {
  if (view?.kind === "status" && !view.lead) return statusText(view.status);
  if (view?.kind === "profile") return view.lead;
  return "";
}

/** The whole answer as plain text: what the model wrote (or the app's words), then its view (whose first line is the app's sentence). */
export function answerAsText(text: string, view?: AnswerView): string {
  const written = text.trim() || fallbackText(view);
  const lines = view ? viewLines(view) : [];
  return [written, lines.join("\n")].filter(Boolean).join("\n\n");
}
