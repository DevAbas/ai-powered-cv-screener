import { z } from "zod";
import { CandidateIdSchema } from "./contract.candidate";
import { AnswerViewSchema } from "./contract.view";

// POST /api/ask: the request, and the NDJSON events streamed back. Progress
// while the tools run, the final step's text, then exactly one `answer` (the
// text, its view, its sources, what was matched and which model answered) or
// one `error`.

/** Longest earlier answer sent back as context; older text is cut, not the question. */
export const HISTORY_ANSWER_MAX = 4_000;

export const HistoryTurnSchema = z.object({
  question: z.string().min(1),
  answer: z.string().max(HISTORY_ANSWER_MAX),
  /** Candidates the answer showed, so a follow-up can narrow them. */
  candidateIds: z.array(CandidateIdSchema),
});
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  history: z.array(HistoryTurnSchema).max(10),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

/** Understanding the question, a tool running, the answer being written. */
export const PROGRESS_STAGES = ["understand", "search", "write"] as const;
export const ProgressStageSchema = z.enum(PROGRESS_STAGES);
export type ProgressStage = z.infer<typeof ProgressStageSchema>;

/** A CV the answer shows, opened at the page that supports it. */
export const AnswerSourceSchema = z.object({
  candidateId: CandidateIdSchema,
  name: z.string().min(1),
  page: z.number().int().min(1),
});
export type AnswerSource = z.infer<typeof AnswerSourceSchema>;

/** What the search did: CVs matched by a filter or count, or CVs read in full; null when no tool ran. */
export const AnswerMatchedSchema = z.object({
  kind: z.enum(["matched", "read"]),
  count: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type AnswerMatched = z.infer<typeof AnswerMatchedSchema>;

/** Which model answered, and whether it was the fallback. */
export const AnsweredBySchema = z.object({
  name: z.string().min(1),
  fellBack: z.boolean(),
});
export type AnsweredBy = z.infer<typeof AnsweredBySchema>;

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
      /** The whole answer text, Markdown; may be empty when the view says it all. */
      text: z.string(),
      /** The data under the answer, drawn from the tool results (DESIGN.md, Answer views). */
      view: AnswerViewSchema.optional(),
      /** The CVs the view shows, each opened at its page. */
      sources: z.array(AnswerSourceSchema),
      matched: AnswerMatchedSchema.nullable(),
      answeredBy: AnsweredBySchema,
    })
    .refine((answer) => answer.text.trim().length > 0 || answer.view !== undefined, { message: "An answer needs text or a view" }),
  z.object({
    type: z.literal("error"),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
]);
export type AskEvent = z.infer<typeof AskEventSchema>;
