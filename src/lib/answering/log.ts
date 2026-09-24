import type { AnswerModelId } from "@/contracts/ask";
import type { ModelTarget } from "@/lib/ai/registry";

// One structured log line per request (PLAN, Retrieval and answering:
// logging): the model actually used, every tool call with its arguments,
// result and error, repairs, fallback events, latency and the outcome.

export interface ToolCallLog {
  step: number;
  tool: string;
  input: unknown;
  ok: boolean;
  /** A short summary of the result, or the error. */
  detail: string;
  ms?: number;
}

export interface StepLog {
  step: number;
  finishReason: string;
  modelId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface RequestLog {
  event: "ask";
  requestId: string;
  question: string;
  model: { requested: AnswerModelId; used: string | null; provider?: string; fellBack: boolean };
  steps: StepLog[];
  toolCalls: ToolCallLog[];
  repairs: number;
  fallbacks: { from: string; to: string; reason: string }[];
  presentation?: { view: string; candidates: number; corrections: string[] };
  /** Every candidate id any tool returned, in order. */
  candidatesReturned: string[];
  /** Ids the presentation named that no tool returned; the answer failed on them. */
  rejectedCandidates?: string[];
  outcome: "answer" | "error" | "aborted";
  error?: string;
  latencyMs: number;
  counters: Record<string, { success: number; error: number }>;
}

/** A failure on one line. */
export function brief(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message.replace(/\s+/g, " ").slice(0, 500)}` : String(error);
}

/** A result on one line, for the log: what kind and how much. */
export function summarize(tool: string, result: unknown): string {
  if (Array.isArray(result)) return `${result.length} item(s)`;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    if (tool === "find_candidates") return `${String(r.matched)} of ${String(r.total)} matched`;
    if (tool === "count_candidates") return `${String(r.count)} of ${String(r.total)}`;
  }
  return JSON.stringify(result)?.slice(0, 200) ?? String(result);
}

export const modelLabel = (target: ModelTarget): string => `${target.provider}:${target.model}`;
