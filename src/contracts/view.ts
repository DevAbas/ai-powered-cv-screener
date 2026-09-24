import { z } from "zod";
import { CandidateIdSchema, CandidateProfileSchema } from "./candidate";

// Answer views (PRD §5; DESIGN.md, Answer views). The model calls at most one
// "show" tool naming the view and its candidates; the server checks the call,
// fills every fact from the index, and sends the browser an `AnswerView`.
//
// Tool inputs are model output, validated against these schemas before use.
// They use only objects, arrays, strings, numbers, booleans and enums, which
// every provider's function schema accepts, and every field is required:
// strict providers reject optional ones.

/** Most skills a list or comparison shows years for. */
export const MAX_VIEW_SKILLS = 3;

const ToolSkillsSchema = z
  .array(z.string())
  .max(MAX_VIEW_SKILLS)
  .describe("The skills the question is about, so their years are shown; empty when none");

export const ShowCandidatesInputSchema = z.object({
  candidates: z
    .array(
      z.object({
        id: z.string().describe("The candidate's id, as written in the CV heading"),
        note: z.string().describe("Why they fit, in a few words from their CV; empty when the skill years say it all"),
        page: z.number().int().describe("The page of their CV that supports it"),
      }),
    )
    .min(1),
  skills: ToolSkillsSchema,
  ranked: z.boolean().describe("True when the order is your ranking; false lets the app sort"),
});
export type ShowCandidatesInput = z.infer<typeof ShowCandidatesInputSchema>;

export const ShowComparisonInputSchema = z.object({
  ids: z.array(z.string()).length(2).describe("The two candidates' ids"),
  skills: ToolSkillsSchema,
});
export type ShowComparisonInput = z.infer<typeof ShowComparisonInputSchema>;

export const ShowProfileInputSchema = z.object({
  id: z.string().describe("The candidate's id"),
});
export type ShowProfileInput = z.infer<typeof ShowProfileInputSchema>;

/** PRD §7.4: uncertainty is visible, as three distinct states. */
export const ANSWER_STATUSES = ["no-match", "insufficient", "out-of-scope"] as const;
export const AnswerStatusSchema = z.enum(ANSWER_STATUSES);
export type AnswerStatus = z.infer<typeof AnswerStatusSchema>;

export const ReportStatusInputSchema = z.object({
  status: AnswerStatusSchema.describe(
    "no-match: no candidate fits; insufficient: the CVs don't say enough to answer; out-of-scope: the question is not about the candidates",
  ),
});
export type ReportStatusInput = z.infer<typeof ReportStatusInputSchema>;

// What the browser renders: facts from the index, never from the model.

/** A skill asked about, with its years on this CV; null when the CV doesn't list it or states no years. */
export const SkillYearsSchema = z.object({
  skill: z.string().min(1),
  years: z.number().min(0).nullable(),
});
export type SkillYears = z.infer<typeof SkillYearsSchema>;

export const CandidateRowSchema = z.object({
  candidateId: CandidateIdSchema,
  name: z.string().min(1),
  headline: z.string().min(1),
  skills: z.array(SkillYearsSchema),
  note: z.string(),
  /** The CV page the file card opens. */
  page: z.number().int().min(1),
});
export type CandidateRow = z.infer<typeof CandidateRowSchema>;

export const ViewCandidateSchema = z.object({
  candidateId: CandidateIdSchema,
  profile: CandidateProfileSchema,
  /** The view's skills with their years on this CV. */
  skills: z.array(SkillYearsSchema),
  page: z.number().int().min(1),
});
export type ViewCandidate = z.infer<typeof ViewCandidateSchema>;

export const AnswerViewSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("list"),
    /** In the model's order when ranked; otherwise sorted by the first skill's years. */
    ranked: z.boolean(),
    skills: z.array(z.string().min(1)).max(MAX_VIEW_SKILLS),
    rows: z.array(CandidateRowSchema).min(1),
  }),
  z.object({
    kind: z.literal("comparison"),
    skills: z.array(z.string().min(1)).max(MAX_VIEW_SKILLS),
    candidates: z.array(ViewCandidateSchema).length(2),
  }),
  z.object({
    kind: z.literal("profile"),
    candidate: ViewCandidateSchema,
  }),
  z.object({
    kind: z.literal("status"),
    status: AnswerStatusSchema,
  }),
]);
export type AnswerView = z.infer<typeof AnswerViewSchema>;
