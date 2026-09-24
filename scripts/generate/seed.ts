import { z } from "zod";
import type { CandidateSeed } from "@/contracts/candidate";
import {
  CandidateIdSchema,
  CandidateProfileSchema,
  CandidateSeedSchema,
  EmploymentSeedSchema,
  SkillGroupSchema,
  SkillSchema,
  LanguageSchema,
  EducationSchema,
} from "@/contracts/candidate";
import type { Seniority } from "@/contracts/candidate";
import { aliasKey, normalizeProfile, normalizeSkill } from "@/lib/pool/normalize";
import type { RosterCandidate } from "./roster";

// Pure parts of the seed step: what the script derives, what the model
// fills in, and the consistency rules a generated seed must pass.

/** The month generation treats as "now", so dates stay stable across runs. */
export const CURRENT_MONTH = "2026-09";

/** Lowercase slug of a name, diacritics stripped: "Inés García" → "ines-garcia". */
export function slugOf(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return CandidateIdSchema.parse(slug);
}

/** Synthetic contact details in the contract's reserved formats. */
export function contactFor(name: string, index: number): CandidateSeed["contact"] {
  const parts = slugOf(name).split("-");
  const first = parts[0];
  const last = parts[parts.length - 1];
  const nn = String(index + 1).padStart(2, "0");
  return { email: `${first}.${last}@example.com`, phone: `+1-555-0${nn}-${nn}${nn}` };
}

/** Layout template per roster position, so the three formats alternate. */
export function templateFor(index: number): number {
  return index % 3;
}

// Everything the built-in PDF fonts can encode: printable ASCII, Latin-1,
// and the few extras WinAnsi places at 0x80–0x9F. Newlines pass.
const WINANSI = /^[\x20-\x7E\xA0-\xFF\n€ŠšŽžŒœŸ‘’“”•–—…‚„†‡ˆ‰‹›™ƒ˜]*$/u;

export function isWinAnsi(text: string): boolean {
  return WINANSI.test(text);
}

/** Strings anywhere in the value that the PDF fonts cannot encode. */
export function nonWinAnsiStrings(value: unknown): string[] {
  if (typeof value === "string") return isWinAnsi(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(nonWinAnsiStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(nonWinAnsiStrings);
  return [];
}

/** Total years of experience a seniority allows, inclusive. */
export const SENIORITY_YEARS: Readonly<Record<Seniority, readonly [min: number, max: number]>> = {
  junior: [0, 2],
  mid: [2, 5],
  senior: [5, 10],
  lead: [8, 15],
  principal: [10, 20],
};

function monthIndex(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return year * 12 + (month - 1);
}

/** Months between two YYYY-MM values; `to` null means the current month. */
export function tenureMonths(from: string, to: string | null): number {
  return monthIndex(to ?? CURRENT_MONTH) - monthIndex(from);
}

/**
 * The part of a seed the model writes. The fixed fields (name, headline,
 * role, seniority, location) come from the roster; contact and template
 * from the script. No `z.union`, for Gemini structured output.
 */
export const GeneratedSeedSchema = CandidateProfileSchema.omit({
  name: true,
  headline: true,
  role: true,
  seniority: true,
  location: true,
}).extend({
  availability: z.number().int().min(0).max(120).describe("Notice period in days; 0 means immediately available"),
  skills: z.array(SkillSchema).min(6).max(14),
  languages: z.array(LanguageSchema).min(1).max(4).describe("Exactly one language is native"),
  education: z.array(EducationSchema).min(1).max(2),
  employment: z.array(EmploymentSeedSchema).min(2).max(5).describe("Most recent first; the current job has to: null"),
  skillGroups: z.array(SkillGroupSchema).min(2).max(7).describe("Every skill of the profile, once, under a category"),
  certifications: z.array(z.string().min(1)).max(4),
  summary: z.string().min(1).describe("3-4 sentences restating the structured fields only"),
  photoPrompt: z
    .string()
    .min(1)
    .describe("One sentence describing a fictional adult for a headshot: apparent age, hair, expression, clothing"),
});
export type GeneratedSeed = z.infer<typeof GeneratedSeedSchema>;

/** The rules `generatedSeedSchemaFor` enforces, in words for the prompt. */
export function seedRules(seniority: Seniority): string[] {
  const [min, max] = SENIORITY_YEARS[seniority];
  return [
    `yearsTotal is between ${min} and ${max} (${seniority}).`,
    "employment is most recent first; the first entry is the current job with to: null unless availability is 0; every other entry has a to.",
    `Dates are YYYY-MM, each from is earlier than the previous entry's from, no date is after ${CURRENT_MONTH}, and the sum of all tenures is within 18 months of yearsTotal.`,
    "No skill has more years than yearsTotal.",
    "The earliest education year is no later than the year the first job started, plus one.",
    ...(seniority === "lead" || seniority === "principal" ? ["leadership.has is true, with a note."] : []),
    "Exactly one language has level native.",
    "Every job's stack lists only names from skills, and skillGroups lists every skill exactly once under a category.",
    "Each job has a one-sentence description of the employer's product or domain, and highlights read like CV bullets: start with a verb, name the technologies from the job's stack.",
    "Use only plain Latin letters and Western European accents (é, ö, ß); no other scripts or letters such as ł, č, ő.",
  ];
}

/** The generated schema with the consistency rules for one seniority; a violation is a schema failure the model repairs. */
export function generatedSeedSchemaFor(seniority: Seniority) {
  return GeneratedSeedSchema.superRefine((seed, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const [min, max] = SENIORITY_YEARS[seniority];
    if (seed.yearsTotal < min || seed.yearsTotal > max) {
      issue(["yearsTotal"], `Must be between ${min} and ${max} for ${seniority}`);
    }

    const jobs = seed.employment;
    if (jobs[0]?.to !== null && seed.availability !== 0) {
      issue(["employment", 0, "to"], "The current job must have to: null unless availability is 0");
    }
    let tenure = 0;
    jobs.forEach((job, i) => {
      if (i > 0 && job.to === null) issue(["employment", i, "to"], "Only the first job may have to: null");
      if (job.from > CURRENT_MONTH) issue(["employment", i, "from"], `Must not be after ${CURRENT_MONTH}`);
      if (job.to !== null && job.to > CURRENT_MONTH) issue(["employment", i, "to"], `Must not be after ${CURRENT_MONTH}`);
      if (job.to !== null && job.to < job.from) issue(["employment", i, "to"], "Must not be before from");
      if (i > 0 && job.from >= jobs[i - 1].from) issue(["employment", i, "from"], "Must be earlier than the previous entry");
      tenure += Math.max(0, tenureMonths(job.from, job.to));
    });
    if (Math.abs(tenure - seed.yearsTotal * 12) > 18) {
      issue(["yearsTotal"], `Tenures sum to ${Math.round(tenure / 12)} years; must be within 1.5 years of yearsTotal`);
    }

    seed.skills.forEach((skill, i) => {
      if (skill.years !== undefined && skill.years > seed.yearsTotal) {
        issue(["skills", i, "years"], "Must not exceed yearsTotal");
      }
    });

    const oldest = jobs[jobs.length - 1];
    const earliestDegree = Math.min(...seed.education.map((e) => e.year));
    if (oldest && earliestDegree > Number(oldest.from.slice(0, 4)) + 1) {
      issue(["education"], "The earliest degree must be no later than the year after the first job started");
    }

    if ((seniority === "lead" || seniority === "principal") && !seed.leadership.has) {
      issue(["leadership", "has"], `Must be true for ${seniority}`);
    }

    const native = seed.languages.filter((l) => l.level === "native").length;
    if (native !== 1) issue(["languages"], "Exactly one language must be native");

    const skillKeys = new Set(seed.skills.map((s) => aliasKey(normalizeSkill(s.name))));
    const known = (name: string) => skillKeys.has(aliasKey(normalizeSkill(name)));
    jobs.forEach((job, i) => {
      job.stack.forEach((name, j) => {
        if (!known(name)) issue(["employment", i, "stack", j], `"${name}" is not one of skills`);
      });
    });
    const grouped = new Map<string, number>();
    seed.skillGroups.forEach((group, g) => {
      group.skills.forEach((name, j) => {
        if (!known(name)) issue(["skillGroups", g, "skills", j], `"${name}" is not one of skills`);
        const key = aliasKey(normalizeSkill(name));
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      });
    });
    seed.skills.forEach((skill) => {
      const count = grouped.get(aliasKey(normalizeSkill(skill.name))) ?? 0;
      if (count !== 1) issue(["skillGroups"], `"${skill.name}" must appear in exactly one group (found ${count} times)`);
    });

    for (const text of nonWinAnsiStrings(seed)) {
      issue([], `Contains characters the CV fonts cannot print: ${JSON.stringify(text)}`);
    }
  });
}

/** The fixed fields, the generated fields and the derived ones as one validated, normalised seed. */
export function assembleSeed(roster: RosterCandidate, index: number, generated: GeneratedSeed): CandidateSeed {
  const seed = {
    ...generated,
    name: roster.name,
    headline: roster.headline,
    role: roster.role,
    seniority: roster.seniority,
    location: roster.location,
    contact: contactFor(roster.name, index),
    template: templateFor(index),
  };
  // normalizeProfile spreads its input, so the seed-only fields survive;
  // stacks and groups get the same canonical skill names.
  const profile = normalizeProfile(seed);
  return CandidateSeedSchema.parse({
    ...profile,
    employment: seed.employment.map((job) => ({ ...job, stack: job.stack.map(normalizeSkill) })),
    skillGroups: seed.skillGroups.map((group) => ({ ...group, skills: group.skills.map(normalizeSkill) })),
  });
}

export interface SeedPrompt {
  instructions: string;
  prompt: string;
}

export function seedPrompt(roster: RosterCandidate, usedCompanies: readonly string[]): SeedPrompt {
  const instructions = [
    "You write one synthetic, fictional candidate profile for a recruiting demo. Nothing may describe a real person or a real employer.",
    "The fixed fields (name, headline, role, seniority, location) are given; fill in everything else so it is plausible for that person and place.",
    "Employers are invented company names with an industry; never real companies. Write in English; city and institution names in plain Latin letters.",
    "summary and each job's highlights only restate facts that are in the structured fields (skills, years, titles, industries, leadership); they add no new facts.",
    "photoPrompt describes a fictional adult whose apparent age fits yearsTotal plus about 23 years; no names, no real people.",
    "Rules the profile must satisfy:",
    ...seedRules(roster.seniority).map((rule) => `- ${rule}`),
  ].join("\n");
  const prompt = [
    `Fixed fields:\n${JSON.stringify({ name: roster.name, headline: roster.headline, role: roster.role, seniority: roster.seniority, location: roster.location }, null, 2)}`,
    usedCompanies.length
      ? `Company names already used by other candidates; do not reuse them:\n${usedCompanies.join(", ")}`
      : "",
    "Return the profile as one JSON object.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { instructions, prompt };
}

/** Ids whose employment (company and title sets) is identical to another seed's. */
export function findDuplicateEmployment(seeds: readonly Pick<CandidateSeed, "employment">[], ids: readonly string[]): string[][] {
  const groups = new Map<string, string[]>();
  seeds.forEach((seed, i) => {
    const key = seed.employment
      .map((job) => `${job.company.toLowerCase()}|${job.title.toLowerCase()}`)
      .sort()
      .join("\n");
    groups.set(key, [...(groups.get(key) ?? []), ids[i]]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}
