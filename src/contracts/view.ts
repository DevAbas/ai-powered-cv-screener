import { z } from "zod";
import { CandidateIdSchema, CandidateProfileSchema } from "./candidate";
import { MAX_PRESENT_SKILLS } from "./tools";

// Answer views (PRD §5; DESIGN.md, Answer views): what the browser renders,
// built by the server from the tool results after the model's presentation
// call (contracts/tools.ts). Every fact comes from the index, never from
// the model; the model contributes the view, the order of a ranking and a
// reason per row.

/** Most skills a list or comparison shows years for. */
export const MAX_VIEW_SKILLS = MAX_PRESENT_SKILLS;

/** PRD §7.4: uncertainty is visible, as three distinct states. */
export const ANSWER_STATUSES = ["no-match", "insufficient", "out-of-scope"] as const;
export const AnswerStatusSchema = z.enum(ANSWER_STATUSES);
export type AnswerStatus = z.infer<typeof AnswerStatusSchema>;

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
  /** The model's reason, in a few words; empty when the view says it all. */
  reason: z.string(),
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
    /** In the model's order when ranked; otherwise in the app's order. */
    ranked: z.boolean(),
    skills: z.array(z.string().min(1)).max(MAX_VIEW_SKILLS),
    /** Empty for a count shown without its list. */
    rows: z.array(CandidateRowSchema),
    /** The exact count, from `count_candidates`. */
    count: z.object({ matched: z.number().int().min(0), total: z.number().int().min(0) }).optional(),
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
