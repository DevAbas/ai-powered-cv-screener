import { z } from "zod";
import type { Degree, LanguageLevel, Role, Seniority, WorkMode } from "./contract.candidate";
import { DEGREES, LANGUAGE_LEVELS, ROLES, SENIORITIES, WORK_MODES } from "./contract.candidate";

// The tools the answer model calls (PLAN, Retrieval and answering). Their
// arguments are enums built from the pool's own values, so a question's
// wording is mapped to what the CVs say and a value outside the pool is
// rejected, never silently matched to nothing. The schemas are factories
// over the vocabulary; the shapes below give the app their static types.

/** Every value the pool holds for each filterable field. */
export interface Vocabulary {
  candidateIds: readonly string[];
  roles: readonly Role[];
  seniorities: readonly Seniority[];
  skills: readonly string[];
  languages: readonly string[];
  levels: readonly LanguageLevel[];
  cities: readonly string[];
  countries: readonly string[];
  institutions: readonly string[];
  degrees: readonly Degree[];
  fields: readonly string[];
  companies: readonly string[];
  industries: readonly string[];
  certifications: readonly string[];
  workModes: readonly WorkMode[];
  workAuthorizations: readonly string[];
}

/** A closed range: `gte`/`gt` bound it below, `lte`/`lt` above (PLAN, filter semantics). */
export const RangeSchema = z
  .object({
    gte: z.number().optional().describe("at least"),
    gt: z.number().optional().describe("more than"),
    lte: z.number().optional().describe("at most"),
    lt: z.number().optional().describe("less than"),
  })
  .describe("A numeric range; combine bounds as needed");
export type Range = z.infer<typeof RangeSchema>;

/** The whole pool, or the candidates of the previous answer (a follow-up). */
export const SCOPES = ["whole_pool", "previous_answer"] as const;
export const ScopeSchema = z.enum(SCOPES).describe("whole_pool, or previous_answer to narrow the last answer's candidates");
export type Scope = z.infer<typeof ScopeSchema>;

/** The views the model can present, and the three states (PRD, Use cases). */
export const PRESENT_VIEWS = ["list", "ranked", "comparison", "profile", "count", "no_match", "not_enough_information", "out_of_scope"] as const;
export const PresentViewSchema = z.enum(PRESENT_VIEWS);

/** Most skills a list or comparison shows years for. */
export const MAX_PRESENT_SKILLS = 3;

// The static shapes: every enum field is a string here, and the factories
// narrow it to the pool's values at run time. The shapes exist for the types.

export const FiltersShape = z.object({
  roles: z.array(z.string()).optional().describe("Any of these role families"),
  seniorities: z.array(z.string()).optional().describe("Any of these seniorities"),
  minSeniority: z.string().optional().describe("This seniority or above (junior < mid < senior < lead < principal)"),
  maxSeniority: z.string().optional().describe("This seniority or below"),
  skills: z
    .array(z.object({ skill: z.string(), years: RangeSchema.optional().describe("Years with the skill, when the question states them") }))
    .optional()
    .describe("Skills the candidate must have"),
  skillsMatch: z.enum(["all", "any"]).optional().describe("all (default): every listed skill; any: at least one"),
  languages: z
    .array(z.object({ language: z.string(), minLevel: z.string().optional().describe("This CEFR level or above (A1 < A2 < B1 < B2 < C1 < C2 < native); omit for any level") }))
    .optional()
    .describe("Languages the candidate must speak"),
  cities: z.array(z.string()).optional().describe("Any of these cities"),
  countries: z.array(z.string()).optional().describe("Any of these countries"),
  workModes: z.array(z.string()).optional().describe("Any of these work modes"),
  workAuthorizations: z.array(z.string()).optional().describe("Any of these work authorizations, as the CVs state them"),
  availabilityDays: RangeSchema.optional().describe("Notice period in days; 0 is available immediately"),
  yearsTotal: RangeSchema.optional().describe("Total years of experience"),
  institutions: z.array(z.string()).optional().describe("Any of these institutions, by full name"),
  degrees: z.array(z.string()).optional().describe("Any of these degree levels"),
  fields: z.array(z.string()).optional().describe("Any of these fields of study"),
  graduationYear: RangeSchema.optional(),
  companies: z.array(z.string()).optional().describe("Any of these employers"),
  industries: z.array(z.string()).optional().describe("Any of these industries worked in"),
  certifications: z.array(z.string()).optional().describe("Any of these certifications"),
  leadership: z.boolean().optional().describe("true: has leadership experience"),
  medianTenureMonths: RangeSchema.optional().describe("Job stability: the median length of the candidate's jobs, in months"),
});
export type Filters = z.infer<typeof FiltersShape>;

const enumOf = (values: readonly string[]) =>
  values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string().refine(() => false, { message: "The pool has no values for this field" });

/** The filters, with every enum narrowed to the pool's values. */
export function filtersSchema(v: Vocabulary): z.ZodType<Filters> {
  const list = (values: readonly string[]) => z.array(enumOf(values));
  return z.object({
    roles: list(v.roles).optional().describe("Any of these role families"),
    seniorities: list(v.seniorities).optional().describe("Any of these seniorities"),
    minSeniority: enumOf(v.seniorities).optional().describe("This seniority or above (junior < mid < senior < lead < principal)"),
    maxSeniority: enumOf(v.seniorities).optional().describe("This seniority or below"),
    skills: z
      .array(z.object({ skill: enumOf(v.skills), years: RangeSchema.optional().describe("Years with the skill, when the question states them") }))
      .optional()
      .describe("Skills the candidate must have"),
    skillsMatch: z.enum(["all", "any"]).optional().describe("all (default): every listed skill; any: at least one"),
    languages: z
      .array(z.object({ language: enumOf(v.languages), minLevel: enumOf(v.levels).optional().describe("This CEFR level or above (A1 < A2 < B1 < B2 < C1 < C2 < native); omit for any level") }))
      .optional()
      .describe("Languages the candidate must speak"),
    cities: list(v.cities).optional().describe("Any of these cities"),
    countries: list(v.countries).optional().describe("Any of these countries"),
    workModes: list(v.workModes).optional().describe("Any of these work modes"),
    workAuthorizations: list(v.workAuthorizations).optional().describe("Any of these work authorizations, as the CVs state them"),
    availabilityDays: RangeSchema.optional().describe("Notice period in days; 0 is available immediately"),
    yearsTotal: RangeSchema.optional().describe("Total years of experience"),
    institutions: list(v.institutions).optional().describe("Any of these institutions, by full name"),
    degrees: list(v.degrees).optional().describe("Any of these degree levels"),
    fields: list(v.fields).optional().describe("Any of these fields of study"),
    graduationYear: RangeSchema.optional(),
    companies: list(v.companies).optional().describe("Any of these employers"),
    industries: list(v.industries).optional().describe("Any of these industries worked in"),
    certifications: list(v.certifications).optional().describe("Any of these certifications"),
    leadership: z.boolean().optional().describe("true: has leadership experience"),
    medianTenureMonths: RangeSchema.optional().describe("Job stability: the median length of the candidate's jobs, in months"),
  });
}

export const FindCandidatesShape = z.object({ filters: FiltersShape, scope: ScopeSchema });
export type FindCandidatesInput = z.infer<typeof FindCandidatesShape>;

/** `find_candidates` and `count_candidates` take the same input. */
export function findCandidatesInput(v: Vocabulary): z.ZodType<FindCandidatesInput> {
  return z.object({ filters: filtersSchema(v).describe("Empty for every candidate"), scope: ScopeSchema });
}

export const GetCandidatesShape = z.object({ ids: z.array(z.string()).min(1).max(5) });
export type GetCandidatesInput = z.infer<typeof GetCandidatesShape>;

export function getCandidatesInput(v: Vocabulary): z.ZodType<GetCandidatesInput> {
  return z.object({ ids: z.array(enumOf(v.candidateIds)).min(1).max(5).describe("The candidates' ids, from the directory") });
}

export const SearchCvTextShape = z.object({
  query: z.string().min(1),
  filters: FiltersShape.optional(),
  scope: ScopeSchema,
  limit: z.number().int().min(1).max(10).optional(),
});
export type SearchCvTextInput = z.infer<typeof SearchCvTextShape>;

export function searchCvTextInput(v: Vocabulary): z.ZodType<SearchCvTextInput> {
  return z.object({
    query: z.string().min(1).describe("What to look for in the CVs' text, in plain words"),
    filters: filtersSchema(v).optional().describe("Narrow the search to candidates matching these"),
    scope: ScopeSchema,
    limit: z.number().int().min(1).max(10).optional().describe("Candidates to return; 10 when omitted"),
  });
}

export const PresentShape = z.object({
  view: PresentViewSchema,
  candidates: z.array(z.object({ id: z.string(), page: z.number().int().min(1), reason: z.string() })),
  skills: z.array(z.string()).max(MAX_PRESENT_SKILLS),
});
export type PresentInput = z.infer<typeof PresentShape>;

/** The presentation call: the view or state, the candidates by id with the page that supports each, and the skills to show years for. */
export function presentInput(v: Vocabulary): z.ZodType<PresentInput> {
  return z.object({
    view: PresentViewSchema.describe(
      "list: candidates in the app's order; ranked: in your order, a reason each; comparison: two candidates; profile: one; count: the count, with or without the list; no_match, not_enough_information, out_of_scope: the states, with no candidates",
    ),
    candidates: z
      .array(
        z.object({
          id: enumOf(v.candidateIds),
          page: z.number().int().min(1).describe("The page of their CV the tool result cites for this answer"),
          reason: z.string().describe("Why they fit, in a few words; empty when the view says it all"),
        }),
      )
      .describe("The candidates to show, from the tool results only; empty for a state or a count without the list"),
    skills: z.array(enumOf(v.skills)).max(MAX_PRESENT_SKILLS).describe("The skills the question is about, so their years are shown; empty when none"),
  });
}

/** The static vocabulary lists the contract enumerates itself. */
export const STATIC_VOCABULARY = { roles: ROLES, seniorities: SENIORITIES, levels: LANGUAGE_LEVELS, degrees: DEGREES, workModes: WORK_MODES } as const;
