import type { Role, Filters, Range } from "@/contracts";

// A filter put into words (PLAN, Retrieval and answering: views): the
// opening sentence of a filter, count or list is composed by the app from
// the tool call and its result, so the count and the criteria in it are
// the tools', never the model's. Each criterion becomes a phrase that
// follows "candidates": "with React experience", "who speak German",
// "based in Germany"; for a single match the phrase agrees ("who speaks
// German", "in a QA role") and the sentence offers their CV.

const ROLE_WORDS: Record<Role, string> = {
  frontend: "frontend",
  backend: "backend",
  fullstack: "full-stack",
  mobile: "mobile",
  data: "data",
  devops: "DevOps",
  qa: "QA",
  security: "security",
  product: "product",
  other: "other",
};

/** "a, b and c" / "a or b". */
export function join(items: readonly string[], word: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${word} ${items.at(-1)}`;
}

/** A range in words: "5+", "under 2", "at most 2", "more than 10", "2 to 5". */
export function rangeWords(range: Range, unit: string): string {
  const lower = range.gte !== undefined ? `${range.gte}+` : range.gt !== undefined ? `more than ${range.gt}` : undefined;
  const upper = range.lte !== undefined ? `at most ${range.lte}` : range.lt !== undefined ? `under ${range.lt}` : undefined;
  if (lower && upper) return `${range.gte ?? range.gt} to ${range.lte ?? range.lt} ${unit}`;
  return `${lower ?? upper ?? "any"} ${unit}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The criteria as phrases after "candidates", in the order the filter names them; `one` words them for a single candidate. */
export function describeFilters(filters: Filters, one = false): string[] {
  const phrases: string[] = [];
  if (filters.skills?.length) {
    const skills = filters.skills.map((s) => (s.years ? `${rangeWords(s.years, "years")} of ${s.skill}` : s.skill));
    phrases.push(`with ${join(skills, filters.skillsMatch === "any" ? "or" : "and")} experience`);
  }
  if (filters.languages?.length) {
    phrases.push(`who ${one ? "speaks" : "speak"} ${join(filters.languages.map((l) => (l.minLevel ? `${l.language} at ${l.minLevel === "native" ? "native level" : `${l.minLevel} or above`}` : l.language)), "and")}`);
  }
  if (filters.roles?.length) {
    const roles = join(filters.roles.map((role) => ROLE_WORDS[role as Role] ?? role), "or");
    phrases.push(one ? `in ${/^[aeiou]/i.test(roles) ? "an" : "a"} ${roles} role` : `in ${roles} roles`);
  }
  if (filters.seniorities?.length) phrases.push(`at ${join(filters.seniorities, "or")} level`);
  if (filters.minSeniority) phrases.push(`at ${filters.minSeniority} level or above`);
  if (filters.maxSeniority) phrases.push(`at ${filters.maxSeniority} level or below`);
  const places = [...(filters.cities ?? []), ...(filters.countries ?? [])];
  if (places.length) phrases.push(`based in ${join(places, "or")}`);
  if (filters.workModes?.length) {
    const modes = filters.workModes.map((mode) => (mode === "onsite" ? "on-site" : mode));
    phrases.push(modes.length === 1 && modes[0] === "relocation" ? "open to relocation" : `open to ${join(modes, "or")} work`);
  }
  if (filters.workAuthorizations?.length) phrases.push(`with ${join(filters.workAuthorizations, "or")} work authorization`);
  if (filters.availabilityDays) {
    const r = filters.availabilityDays;
    if (r.lte === 0) phrases.push("available immediately");
    else if (r.lte !== undefined || r.lt !== undefined) phrases.push(`available within ${r.lte ?? (r.lt ?? 0) - 1} days`);
    else phrases.push(`with a notice period of ${rangeWords(r, "days")}`);
  }
  if (filters.yearsTotal) phrases.push(`with ${rangeWords(filters.yearsTotal, "years")} of experience`);
  if (filters.degrees?.length) phrases.push(`with a ${join(filters.degrees.map((d) => (d === "doctorate" ? "doctorate" : `${d}'s degree`)), "or")}`);
  if (filters.fields?.length) phrases.push(`who studied ${join(filters.fields, "or")}`);
  if (filters.institutions?.length) phrases.push(`who studied at ${join(filters.institutions, "or")}`);
  if (filters.graduationYear) {
    const r = filters.graduationYear;
    const from = r.gte ?? (r.gt !== undefined ? r.gt + 1 : undefined);
    const to = r.lte ?? (r.lt !== undefined ? r.lt - 1 : undefined);
    phrases.push(from !== undefined && to !== undefined ? `who graduated between ${from} and ${to}` : from !== undefined ? `who graduated in ${from} or later` : `who graduated in ${to} or earlier`);
  }
  if (filters.companies?.length) phrases.push(`who worked at ${join(filters.companies, "or")}`);
  if (filters.industries?.length) phrases.push(`who worked in ${join(filters.industries, "or")}`);
  if (filters.certifications?.length) {
    const c = filters.certifications;
    phrases.push(c.length === 1 ? `with the ${c[0]} certification` : `with one of these certifications: ${c.join(", ")}`);
  }
  if (filters.leadership !== undefined) phrases.push(filters.leadership ? "with leadership experience" : "without leadership experience");
  if (filters.medianTenureMonths) phrases.push(`with a median job length of ${rangeWords(filters.medianTenureMonths, "months")}`);
  return phrases;
}

export interface LeadInput {
  filters: Filters;
  /** The candidates matched. */
  matched: number;
  /** The pool size, or the previous answer's size for a follow-up. */
  total: number;
  scope: "whole_pool" | "previous_answer";
  /** Rows follow the sentence. */
  rowsShown: boolean;
  /** A count question: the count is the answer. */
  counted: boolean;
}

/** The opening sentence of a filter, count, list or no match, in plain words. */
export function leadSentence({ filters, matched, total, scope, rowsShown, counted }: LeadInput): string {
  const one = matched === 1;
  const criteria = describeFilters(filters, one).join(" ");
  const follow = rowsShown ? (one ? " Here is their CV." : " Here are their details.") : "";
  if (!criteria) {
    if (scope === "previous_answer") return `Here are the previous ${plural(matched, "candidate")} again.`;
    return matched === 0 ? "There are no candidates in the pool." : `There are ${plural(matched, "candidate")} in the pool.${rowsShown ? " Here are all of them." : ""}`;
  }
  if (scope === "previous_answer") {
    if (matched === 0) return `Of the previous ${plural(total, "candidate")}, there are none ${criteria}.`;
    return `Of the previous ${plural(total, "candidate")}, there ${matched === 1 ? "is" : "are"} ${matched} ${criteria}.${follow}`;
  }
  if (matched === 0) return `There are no candidates ${criteria}.`;
  if (counted) return `Out of ${plural(total, "candidate")}, there ${matched === 1 ? "is" : "are"} ${matched} ${criteria}.${follow}`;
  return `There ${matched === 1 ? "is" : "are"} ${plural(matched, "candidate")} ${criteria}.${follow}`;
}

/** The opening sentence of a text search shown as a list. */
export function searchLead(matched: number, rowsShown: boolean): string {
  if (matched === 0) return "No CV matches what you asked.";
  return `${plural(matched, "CV")} match what you asked.${rowsShown ? " Here are the candidates." : ""}`;
}
