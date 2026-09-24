import type { CallBudget } from "@/lib/ai/structured";

// Every tunable of the answering service in one place. The retrieval values
// are the reference repo's (Minacava/cv-screener, app/api/chat/route.ts).

export interface RetrievalConfig {
  /** Vectors asked for per question: the whole pool. */
  topK: number;
  /** The best match must reach this for any CV to be kept (it filters off-topic messages). */
  minTopScore: number;
  /** Then every match at this score or above is kept. */
  minScore: number;
}

export const RETRIEVAL: RetrievalConfig = { topK: 30, minTopScore: 0.5, minScore: 0.45 };

/** Planning a question is a short call; if it fails, the question is searched as typed. */
export const PLAN_BUDGET: CallBudget = { firstOutputMs: 8_000, totalMs: 20_000 };
