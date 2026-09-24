import { z } from "zod";
import { CandidateIdSchema } from "./candidate";
import { AnswerViewSchema } from "./view";

// POST /api/ask: the request, and the NDJSON events streamed back
// (PLAN, Retrieval and answering). Progress, then the answer text as it is
// written, then exactly one `answer` (the whole text, its view and sources)
// or one `error`.

export const ANSWER_MODEL_IDS = ["primary", "alternative", "openrouter-free"] as const;
export const AnswerModelIdSchema = z.enum(ANSWER_MODEL_IDS);
export type AnswerModelId = z.infer<typeof AnswerModelIdSchema>;

/** Longest earlier answer sent back as context; older text is cut, not the question. */
export const HISTORY_ANSWER_MAX = 4_000;

export const HistoryTurnSchema = z.object({
  question: z.string().min(1),
  answer: z.string().max(HISTORY_ANSWER_MAX),
  /** Candidates the answer named, so a follow-up can refer back to them. */
  candidateIds: z.array(CandidateIdSchema),
});
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  model: AnswerModelIdSchema,
  history: z.array(HistoryTurnSchema).max(10),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const PROGRESS_STAGES = ["search", "read", "write"] as const;
export const ProgressStageSchema = z.enum(PROGRESS_STAGES);
export type ProgressStage = z.infer<typeof ProgressStageSchema>;

/** A CV the answer names, opened at the page that supports it. */
export const AnswerSourceSchema = z.object({
  candidateId: CandidateIdSchema,
  name: z.string().min(1),
  page: z.number().int().min(1),
});
export type AnswerSource = z.infer<typeof AnswerSourceSchema>;

export const AskEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    stage: ProgressStageSchema,
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("delta"),
    text: z.string().min(1),
  }),
  z
    .object({
      type: z.literal("answer"),
      /** The whole answer, Markdown; may be empty when the view says it all. */
      text: z.string(),
      /** The data under the answer, drawn from the CVs (DESIGN.md, Answer views). */
      view: AnswerViewSchema.optional(),
      /** The CVs the view shows, each opened at its page. */
      sources: z.array(AnswerSourceSchema),
      /** How many CVs the answer was written from. */
      checked: z.number().int().min(0),
    })
    .refine((answer) => answer.text.trim().length > 0 || answer.view !== undefined, { message: "An answer needs text or a view" }),
  z.object({
    type: z.literal("error"),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
]);
export type AskEvent = z.infer<typeof AskEventSchema>;
