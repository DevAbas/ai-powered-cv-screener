import type { CandidateSeed, LanguageLevel, Seniority } from "@/contracts";
import { LANGUAGE_LEVELS, SENIORITIES } from "@/contracts";
import { CURRENT_MONTH } from "../generation/seedRules";
import { medianTenureMonths } from "@/lib/candidates";
import type { Seeds } from "./types";

// Pure rule helpers over the seeds (PLAN, Evaluation). Every expectation in
// questions.ts is built from these, so a rule reads like the question.

type Keep = (seed: CandidateSeed) => boolean;

/** The ids of the seeds `keep` accepts, sorted. */
export function ids(seeds: Seeds, keep: Keep): string[] {
  return [...seeds]
    .filter(([, seed]) => keep(seed))
    .map(([id]) => id)
    .sort();
}

export const allIds = (seeds: Seeds): string[] => ids(seeds, () => true);

export function skillYears(seed: CandidateSeed, name: string): number | undefined {
  return seed.skills.find((skill) => skill.name === name)?.years;
}

export const hasSkill = (seed: CandidateSeed, name: string): boolean => seed.skills.some((skill) => skill.name === name);

export const hasAnySkill = (seed: CandidateSeed, names: readonly string[]): boolean => names.some((name) => hasSkill(seed, name));

export function languageLevel(seed: CandidateSeed, language: string): LanguageLevel | undefined {
  return seed.languages.find((entry) => entry.language === language)?.level;
}

/** CEFR order, native above C2 (PLAN, Retrieval and answering: filter semantics). */
export const levelRank = (level: LanguageLevel): number => LANGUAGE_LEVELS.indexOf(level);

export const seniorityRank = (seniority: Seniority): number => SENIORITIES.indexOf(seniority);

/** "Berlin, Germany" → "Germany". */
export const country = (seed: CandidateSeed): string => seed.location.split(", ").at(-1) ?? "";

export const hasCertificationContaining = (seed: CandidateSeed, text: string): boolean =>
  seed.certifications.some((certification) => certification.includes(text));

export const industries = (seed: CandidateSeed): string[] => seed.employment.map((job) => job.industry);

export const companies = (seed: CandidateSeed): string[] => seed.employment.map((job) => job.company);

export const institutions = (seed: CandidateSeed): string[] => seed.education.map((entry) => entry.institution);

/** Job stability as the index derives it: the median job length in months. */
export const medianTenure = (seed: CandidateSeed): number => medianTenureMonths(seed.employment, CURRENT_MONTH) ?? 0;

/** The id whose seed scores highest under `value`; ties broken by id. */
export function argmax(seeds: Seeds, value: (seed: CandidateSeed) => number): string {
  const best = [...seeds].sort(([idA, a], [idB, b]) => value(b) - value(a) || idA.localeCompare(idB))[0];
  if (!best) throw new Error("No seeds");
  return best[0];
}

export function intersection(a: readonly string[], b: readonly string[]): string[] {
  const other = new Set(b);
  return a.filter((id) => other.has(id)).sort();
}

export function union(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])].sort();
}
