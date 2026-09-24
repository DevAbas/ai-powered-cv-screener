import type { CandidateProfile, Language, LanguageLevel, Skill } from "@/contracts/candidate";
import { LANGUAGE_LEVELS } from "@/contracts/candidate";

// Tidying extracted and generated profiles: whitespace, and duplicates that
// differ only in case or punctuation. Names stay as the CV writes them: the
// pool's own values are the vocabulary the tools use (PLAN, Retrieval and
// answering), so no alias table maps one spelling to another.

/** Case-, whitespace- and punctuation-insensitive key for spotting duplicates. Keeps `+` and `#` (C++, C#). */
export function aliasKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}+#]/gu, "");
}

function tidy(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** A skill name with its whitespace tidied. */
export function normalizeSkill(name: string): string {
  return tidy(name);
}

/** A language name with its whitespace tidied. */
export function normalizeLanguage(name: string): string {
  return tidy(name);
}

/** Tidied names, duplicates merged keeping the most years. Order of first appearance is kept. */
export function normalizeSkills(skills: readonly Skill[]): Skill[] {
  const merged = new Map<string, Skill>();
  for (const skill of skills) {
    const name = normalizeSkill(skill.name);
    const key = aliasKey(name);
    const previous = merged.get(key);
    const years = previous?.years === undefined ? skill.years : Math.max(previous.years, skill.years ?? 0);
    merged.set(key, years === undefined ? { name: previous?.name ?? name } : { name: previous?.name ?? name, years });
  }
  return [...merged.values()];
}

const LEVEL_RANK = new Map<LanguageLevel, number>(LANGUAGE_LEVELS.map((level, i) => [level, i]));

/** Tidied names, duplicates merged keeping the highest level. */
export function normalizeLanguages(languages: readonly Language[]): Language[] {
  const merged = new Map<string, Language>();
  for (const entry of languages) {
    const language = normalizeLanguage(entry.language);
    const key = aliasKey(language);
    const previous = merged.get(key);
    const level = previous && (LEVEL_RANK.get(previous.level) ?? 0) > (LEVEL_RANK.get(entry.level) ?? 0) ? previous.level : entry.level;
    merged.set(key, { language: previous?.language ?? language, level });
  }
  return [...merged.values()];
}

/** Applies every tidying rule to a profile. */
export function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    skills: normalizeSkills(profile.skills),
    languages: normalizeLanguages(profile.languages),
    certifications: [...new Map(profile.certifications.map((value) => [aliasKey(value), tidy(value)])).values()],
  };
}
