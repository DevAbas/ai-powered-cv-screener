import { z } from "zod";

// Candidate data model (PLAN, Data model). Schemas an LLM fills avoid
// `z.union`: Gemini structured output does not accept it.

export const ROLES = [
  "frontend",
  "backend",
  "fullstack",
  "mobile",
  "data",
  "devops",
  "qa",
  "security",
  "product",
  "other",
] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const SENIORITIES = ["junior", "mid", "senior", "lead", "principal"] as const;
export const SenioritySchema = z.enum(SENIORITIES);
export type Seniority = z.infer<typeof SenioritySchema>;

export const WORK_MODES = ["onsite", "hybrid", "remote", "relocation"] as const;
export const WorkModeSchema = z.enum(WORK_MODES);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const LANGUAGE_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "native"] as const;
export const LanguageLevelSchema = z.enum(LANGUAGE_LEVELS);
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;

export const DEGREES = ["associate", "bachelor", "master", "doctorate", "other"] as const;
export const DegreeSchema = z.enum(DEGREES);
export type Degree = z.infer<typeof DegreeSchema>;

const YearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected YYYY-MM")
  .describe("Month in YYYY-MM format");

export const SkillSchema = z.object({
  name: z.string().min(1),
  years: z.number().min(0).optional().describe("Years of experience with this skill, if stated"),
});
export type Skill = z.infer<typeof SkillSchema>;

export const LanguageSchema = z.object({
  language: z.string().min(1),
  level: LanguageLevelSchema.describe("CEFR level, or native"),
});
export type Language = z.infer<typeof LanguageSchema>;

export const EducationSchema = z.object({
  degree: DegreeSchema,
  field: z.string().min(1),
  institution: z.string().min(1),
  year: z.number().int().min(1950).max(2100).describe("Graduation year"),
});
export type Education = z.infer<typeof EducationSchema>;

export const EmploymentSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  industry: z.string().min(1),
  from: YearMonthSchema,
  to: YearMonthSchema.nullable().describe("null for the current position"),
});
export type Employment = z.infer<typeof EmploymentSchema>;

export const CandidateProfileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1).describe("Role and seniority as written in the CV"),
  role: RoleSchema,
  seniority: SenioritySchema,
  location: z.string().min(1),
  remote: z.array(WorkModeSchema).min(1).describe("Every work mode the candidate accepts"),
  workAuthorization: z.string().min(1),
  availability: z.number().int().min(0).describe("Notice period in days; 0 means immediately available"),
  yearsTotal: z.number().min(0),
  skills: z.array(SkillSchema),
  languages: z.array(LanguageSchema),
  education: z.array(EducationSchema),
  employment: z.array(EmploymentSchema).describe("Most recent first"),
  leadership: z.object({
    has: z.boolean(),
    note: z.string().describe("Short note on the leadership experience; empty if none"),
  }),
  certifications: z.array(z.string().min(1)),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

export const CandidateIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected a lowercase slug");
export type CandidateId = z.infer<typeof CandidateIdSchema>;

export const CandidateSeedSchema = CandidateProfileSchema.extend({
  contact: z.object({
    email: z.string().regex(/^[^\s@]+@example\.com$/, "Expected an example.com address"),
    phone: z.string().regex(/^\+1-555-\d{3}-\d{4}$/, "Expected +1-555-XXX-XXXX"),
  }),
  photoPrompt: z.string().min(1),
  template: z.number().int().min(0).max(2).describe("PDF layout template, 0–2"),
});
export type CandidateSeed = z.infer<typeof CandidateSeedSchema>;

export const IndexEntrySchema = z.object({
  id: CandidateIdSchema,
  file: z.string().min(1),
  pages: z.number().int().min(1),
  text: z.array(z.string()),
  profile: CandidateProfileSchema,
  medianTenureMonths: z.number().min(0).nullable(),
});
export type IndexEntry = z.infer<typeof IndexEntrySchema>;

export const EmbeddingIndexSchema = z.object({
  model: z.string().min(1),
  dims: z.number().int().min(1),
  vectors: z.array(
    z.object({
      id: CandidateIdSchema,
      page: z.number().int().min(1),
      v: z.array(z.number()),
    }),
  ),
});
export type EmbeddingIndex = z.infer<typeof EmbeddingIndexSchema>;
