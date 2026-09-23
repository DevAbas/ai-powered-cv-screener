import { z } from "zod";
import { AnswerKindSchema, AnswerSchema } from "./answer";
import { CandidateIdSchema } from "./candidate";

// POST /api/ask request and NDJSON stream events (PLAN, Retrieval and answering).

export const ANSWER_MODEL_IDS = ["primary", "alternative"] as const;
export const AnswerModelIdSchema = z.enum(ANSWER_MODEL_IDS);
export type AnswerModelId = z.infer<typeof AnswerModelIdSchema>;

export const HistoryTurnSchema = z.object({
  question: z.string().min(1),
  kind: AnswerKindSchema,
  summary: z.string(),
  candidateIds: z.array(CandidateIdSchema),
});
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  model: AnswerModelIdSchema,
  history: z.array(HistoryTurnSchema).max(10),
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

export const PROGRESS_STAGES = ["filter", "read", "evidence", "compose"] as const;
export const ProgressStageSchema = z.enum(PROGRESS_STAGES);
export type ProgressStage = z.infer<typeof ProgressStageSchema>;

export const AskEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("progress"),
    stage: ProgressStageSchema,
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("answer"),
    answer: AnswerSchema,
  }),
  z.object({
    type: z.literal("error"),
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
]);
export type AskEvent = z.infer<typeof AskEventSchema>;
