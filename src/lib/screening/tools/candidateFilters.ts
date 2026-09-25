import type { FieldSource, IndexEntry, LanguageLevel, SectionName, Seniority, Filters, Range } from "@/contracts";
import { LANGUAGE_LEVELS, SENIORITIES } from "@/contracts";
import { splitLocation } from "@/lib/candidates";

// Exact questions as deterministic queries over the profiles (PLAN,
// Retrieval and answering: filter semantics). A candidate matches when
// every criterion holds; each criterion that holds leaves its evidence:
// the value that satisfied it and the page and section it was read from.

export interface Evidence {
  field: string;
  value: string;
  page: number;
  section: SectionName;
}

export interface Matched {
  entry: IndexEntry;
  evidence: Evidence[];
}

const levelRank = (level: LanguageLevel) => LANGUAGE_LEVELS.indexOf(level);
const seniorityRank = (seniority: Seniority) => SENIORITIES.indexOf(seniority);

/** `gte`/`gt` bound below, `lte`/`lt` above; an unknown value never matches. */
export function inRange(value: number | null | undefined, range: Range | undefined): boolean {
  if (!range) return true;
  if (value === null || value === undefined) return false;
  if (range.gte !== undefined && !(value >= range.gte)) return false;
  if (range.gt !== undefined && !(value > range.gt)) return false;
  if (range.lte !== undefined && !(value <= range.lte)) return false;
  if (range.lt !== undefined && !(value < range.lt)) return false;
  return true;
}

const years = (n: number | undefined) => (n === undefined ? "" : ` (${n} ${n === 1 ? "year" : "years"})`);

/** The evidence of one candidate against the filters, or undefined when a criterion fails. */
export function matchEntry(entry: IndexEntry, filters: Filters): Evidence[] | undefined {
  const { profile, sources } = entry;
  const evidence: Evidence[] = [];
  const cite = (field: string, value: string, source: FieldSource | undefined) => {
    evidence.push({ field, value, page: source?.page ?? 1, section: source?.section ?? "header" });
  };
  const anyOf = <T extends string>(wanted: readonly T[] | undefined, value: T) => wanted === undefined || wanted.includes(value);

  if (!anyOf(filters.roles, profile.role)) return undefined;
  if (filters.roles) cite("role", profile.role, sources.role);

  const seniorityWanted =
    anyOf(filters.seniorities, profile.seniority) &&
    (filters.minSeniority === undefined || seniorityRank(profile.seniority) >= seniorityRank(filters.minSeniority as Seniority)) &&
    (filters.maxSeniority === undefined || seniorityRank(profile.seniority) <= seniorityRank(filters.maxSeniority as Seniority));
  if (!seniorityWanted) return undefined;
  if (filters.seniorities || filters.minSeniority || filters.maxSeniority) cite("seniority", profile.seniority, sources.seniority);

  if (filters.skills && filters.skills.length > 0) {
    const found = filters.skills.flatMap((wanted) => {
      const i = profile.skills.findIndex((skill) => skill.name === wanted.skill);
      const skill = profile.skills[i];
      if (!skill || !inRange(skill.years, wanted.years)) return [];
      return [{ field: "skill", value: `${skill.name}${years(skill.years)}`, source: sources[`skills.${i}`] }];
    });
    const enough = filters.skillsMatch === "any" ? found.length > 0 : found.length === filters.skills.length;
    if (!enough) return undefined;
    for (const item of found) cite(item.field, item.value, item.source);
  }

  if (filters.languages && filters.languages.length > 0) {
    for (const wanted of filters.languages) {
      const i = profile.languages.findIndex((language) => language.language === wanted.language);
      const language = profile.languages[i];
      if (!language) return undefined;
      if (wanted.minLevel !== undefined && levelRank(language.level) < levelRank(wanted.minLevel as LanguageLevel)) return undefined;
      cite("language", `${language.language} (${language.level})`, sources[`languages.${i}`]);
    }
  }

  const location = splitLocation(profile.location);
  if (!anyOf(filters.cities, location.city) || !anyOf(filters.countries, location.country)) return undefined;
  if (filters.cities || filters.countries) cite("location", profile.location, sources.location);

  if (filters.workModes) {
    const modes = profile.remote.filter((mode) => filters.workModes!.includes(mode));
    if (modes.length === 0) return undefined;
    cite("workMode", modes.join(", "), sources.remote);
  }
  if (!anyOf(filters.workAuthorizations, profile.workAuthorization)) return undefined;
  if (filters.workAuthorizations) cite("workAuthorization", profile.workAuthorization, sources.workAuthorization);

  if (!inRange(profile.availability, filters.availabilityDays)) return undefined;
  if (filters.availabilityDays) cite("availability", profile.availability === 0 ? "available immediately" : `notice period ${profile.availability} days`, sources.availability);

  if (!inRange(profile.yearsTotal, filters.yearsTotal)) return undefined;
  if (filters.yearsTotal) cite("yearsTotal", `${profile.yearsTotal} years of experience`, sources.yearsTotal);

  if (filters.institutions || filters.degrees || filters.fields || filters.graduationYear) {
    const i = profile.education.findIndex(
      (e) => anyOf(filters.institutions, e.institution) && anyOf(filters.degrees, e.degree) && anyOf(filters.fields, e.field) && inRange(e.year, filters.graduationYear),
    );
    const education = profile.education[i];
    if (!education) return undefined;
    cite("education", `${education.degree} in ${education.field}, ${education.institution}, ${education.year}`, sources[`education.${i}`]);
  }

  if (filters.companies || filters.industries) {
    const i = profile.employment.findIndex((job) => anyOf(filters.companies, job.company) && anyOf(filters.industries, job.industry));
    const job = profile.employment[i];
    if (!job) return undefined;
    cite("employment", `${job.title}, ${job.company} (${job.industry})`, sources[`employment.${i}`]);
  }

  if (filters.certifications) {
    const held = profile.certifications.map((value, i) => ({ value, i })).filter(({ value }) => filters.certifications!.includes(value));
    if (held.length === 0) return undefined;
    for (const { value, i } of held) cite("certification", value, sources[`certifications.${i}`]);
  }

  if (filters.leadership !== undefined) {
    if (profile.leadership.has !== filters.leadership) return undefined;
    cite("leadership", profile.leadership.has ? profile.leadership.note : "no leadership experience", sources.leadership);
  }

  if (!inRange(entry.medianTenureMonths, filters.medianTenureMonths)) return undefined;
  if (filters.medianTenureMonths && entry.medianTenureMonths !== null) cite("jobStability", `median job length ${entry.medianTenureMonths} months`, sources["employment.0"]);

  return evidence;
}

/** The app's order for a filter: the most years of the first asked skill first, unknown years last, then by name. */
export function orderMatches(matches: readonly Matched[], filters: Filters): Matched[] {
  const first = filters.skills?.[0]?.skill;
  const yearsOf = (entry: IndexEntry) => (first ? (entry.profile.skills.find((skill) => skill.name === first)?.years ?? -1) : 0);
  return [...matches].sort((a, b) => yearsOf(b.entry) - yearsOf(a.entry) || a.entry.profile.name.localeCompare(b.entry.profile.name));
}

/** Every candidate in scope that matches the filters, with the evidence, in the app's order. */
export function applyFilters(entries: readonly IndexEntry[], filters: Filters, scope?: ReadonlySet<string>): Matched[] {
  const matches = entries.flatMap((entry): Matched[] => {
    if (scope && !scope.has(entry.id)) return [];
    const evidence = matchEntry(entry, filters);
    return evidence ? [{ entry, evidence }] : [];
  });
  return orderMatches(matches, filters);
}
