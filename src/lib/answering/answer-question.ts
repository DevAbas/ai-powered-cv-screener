import type { LanguageModel } from "ai";
import type { AskEvent, AskRequest } from "@/contracts/ask";
import type { IndexEntry } from "@/contracts/candidate";
import type { Vocabulary } from "@/contracts/tools";
import type { CircuitBreaker } from "@/lib/ai/breaker";
import { modelBreaker } from "@/lib/ai/breaker";
import { counterSnapshot, recordOutcome } from "@/lib/ai/counters";
import type { Embedder } from "@/lib/ai/embedder";
import { languageModel } from "@/lib/ai/providers";
import type { ModelEntry, ModelTarget } from "@/lib/ai/registry";
import { answerEntry } from "@/lib/ai/registry";
import { shouldFallBack } from "@/lib/ai/retry";
import { runRoute } from "@/lib/ai/route";
import { toolMessage, STAGE_MESSAGES } from "@/lib/ask/stages";
import type { Bm25Index } from "@/lib/retrieval/bm25";
import type { VectorStore } from "@/lib/vector/vector-store";
import { errorEvent } from "./errors";
import type { RequestLog } from "./log";
import { brief, modelLabel } from "./log";
import { EmptyAnswerError, runLoop } from "./loop";
import { buildInstructions, buildMessages } from "./prompt";
import { ResultStore } from "./results";
import { createTools } from "./tools";
import { buildView } from "./views";

// One question, end to end (PLAN, Retrieval and answering): the model
// chooses tools, the tools run over the index, the presentation call is
// checked against their results, the view is built from them, and one
// structured log line records what happened. The primary's fallback takes
// over only while nothing has reached the recruiter but progress.

export interface AnswerPool {
  entries: readonly IndexEntry[];
  vocabulary: Vocabulary;
  bm25: Bm25Index;
}

export interface AnswerDeps {
  pool: AnswerPool;
  embedder: Embedder;
  store: VectorStore;
  /** Builds the SDK model for a target; tests pass mocks. */
  modelFor?: (target: ModelTarget) => LanguageModel;
  breaker?: CircuitBreaker;
  log: (record: RequestLog) => void;
  requestId?: () => string;
}

/** The candidates of the last answer that showed any: what "of those" refers to. */
export function previousCandidateIds(history: AskRequest["history"]): string[] {
  for (let i = history.length - 1; i >= 0; i--) {
    const ids = history[i]?.candidateIds ?? [];
    if (ids.length > 0) return [...ids];
  }
  return [];
}

export async function answerQuestion(request: AskRequest, emit: (event: AskEvent) => void, deps: AnswerDeps, signal: AbortSignal): Promise<void> {
  const { pool, modelFor = languageModel, breaker = modelBreaker } = deps;
  const started = performance.now();
  const byId = new Map(pool.entries.map((entry) => [entry.id, entry]));
  const previousIds = previousCandidateIds(request.history).filter((id) => byId.has(id));
  const record: RequestLog = {
    event: "ask",
    requestId: deps.requestId?.() ?? crypto.randomUUID(),
    question: request.question,
    model: { requested: request.model, used: null, fellBack: false },
    steps: [],
    toolCalls: [],
    repairs: 0,
    fallbacks: [],
    outcome: "error",
    latencyMs: 0,
    counters: {},
  };
  const finish = (outcome: RequestLog["outcome"], error?: unknown) => {
    record.outcome = outcome;
    if (error !== undefined) record.error = brief(error);
    record.latencyMs = Math.round(performance.now() - started);
    record.counters = counterSnapshot();
    deps.log(record);
  };

  const entry: ModelEntry | undefined = answerEntry(request.model);
  if (!entry) {
    finish("error", new Error(`Model ${request.model} is not offered`));
    emit({ type: "error", message: "That model isn't available. Choose another one.", retryable: false });
    return;
  }

  try {
    emit({ type: "progress", stage: "understand", message: STAGE_MESSAGES.understand });
    const run = async (target: ModelTarget) => {
      const store = new ResultStore();
      const tools = createTools({ ...pool, embedder: deps.embedder, store: deps.store, previousIds, signal }, (result) => store.add(result));
      const outcome = await runLoop(modelFor(target), {
        instructions: buildInstructions(pool.entries, previousIds),
        messages: buildMessages(request.history, request.question),
        tools,
        signal,
        onTool: (toolName, input) => emit({ type: "progress", stage: "search", message: toolMessage(toolName, input) }),
        onStep: (step) => record.steps.push(step),
        onToolCall: (call) => record.toolCalls.push(call),
        onRepair: () => {
          record.repairs += 1;
        },
      });
      return { outcome, store };
    };
    const { value, target, fellBack } = await runRoute(entry, {
      breaker,
      signal,
      run,
      // A model that is down, silent or empty may not be the next one's problem; a bad answer is not retried elsewhere.
      canSwitch: (error) => error instanceof EmptyAnswerError || shouldFallBack(error),
      onFailure: (error, from, next) => {
        if (next) record.fallbacks.push({ from: modelLabel(from), to: modelLabel(next), reason: brief(error) });
      },
    });
    const { outcome, store } = value;
    record.model = { requested: request.model, used: outcome.modelId ?? target.model, provider: outcome.provider, fellBack };

    emit({ type: "progress", stage: "write", message: STAGE_MESSAGES.write });
    const built = outcome.present ? buildView(outcome.present, store, byId) : undefined;
    if (built) record.presentation = { view: built.view.kind === "status" ? built.view.status : built.view.kind, candidates: built.sources.length, corrections: built.corrections };
    if (outcome.text) emit({ type: "delta", text: outcome.text });
    const answeredBy = { model: request.model, name: fellBack ? (entry.fallback ? fallbackName(entry) : target.model) : entry.displayName, fellBack };
    recordOutcome(modelLabel(target), true);
    finish("answer");
    emit({
      type: "answer",
      text: outcome.text,
      view: built?.view,
      sources: built?.sources ?? [],
      matched: store.summary,
      answeredBy,
    });
  } catch (error) {
    if (signal.aborted) {
      finish("aborted");
      return;
    }
    recordOutcome(modelLabel(entry), false);
    finish("error", error);
    emit(errorEvent(error));
  }
}

/** The display name of the entry's fallback: the registry entry that pins the same model, if any. */
function fallbackName(entry: ModelEntry): string {
  const fallback = entry.fallback;
  if (!fallback) return entry.displayName;
  const named = answerEntry("alternative");
  return named && named.model === fallback.model ? named.displayName : fallback.model;
}
