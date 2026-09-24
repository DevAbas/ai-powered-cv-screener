import type { IndexEntry } from "@/contracts/candidate";
import { LANGUAGE_LEVELS, SENIORITIES } from "@/contracts/candidate";
import type { Vocabulary } from "@/contracts/tools";

// The pool's own values for every filterable field (PLAN, Retrieval and
// answering: vocabularies): what the tool enums are built from. Ordered
// scales (seniority, language level) list every step, since a question
// names a threshold, not a value the pool must hold.

const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort((a, b) => a.localeCompare(b));

/** "Berlin, Germany" → ["Berlin", "Germany"]; a location without a comma is its own city and country. */
export function splitLocation(location: string): { city: string; country: string } {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  return { city: parts.slice(0, -1).join(", ") || location.trim(), country: parts.at(-1) ?? location.trim() };
}

export function vocabularyOf(entries: readonly IndexEntry[]): Vocabulary {
  const profiles = entries.map((entry) => entry.profile);
  return {
    candidateIds: unique(entries.map((entry) => entry.id)),
    roles: unique(profiles.map((p) => p.role)),
    seniorities: [...SENIORITIES],
    skills: unique(profiles.flatMap((p) => p.skills.map((skill) => skill.name))),
    languages: unique(profiles.flatMap((p) => p.languages.map((language) => language.language))),
    levels: [...LANGUAGE_LEVELS],
    cities: unique(profiles.map((p) => splitLocation(p.location).city)),
    countries: unique(profiles.map((p) => splitLocation(p.location).country)),
    institutions: unique(profiles.flatMap((p) => p.education.map((e) => e.institution))),
    degrees: unique(profiles.flatMap((p) => p.education.map((e) => e.degree))),
    fields: unique(profiles.flatMap((p) => p.education.map((e) => e.field))),
    companies: unique(profiles.flatMap((p) => p.employment.map((job) => job.company))),
    industries: unique(profiles.flatMap((p) => p.employment.map((job) => job.industry))),
    certifications: unique(profiles.flatMap((p) => p.certifications)),
    workModes: unique(profiles.flatMap((p) => p.remote)),
    workAuthorizations: unique(profiles.map((p) => p.workAuthorization)),
  };
}
