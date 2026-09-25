import type { LanguageModel } from "ai";
import type { AnswerModelId, AskEvent, AskRequest, IndexEntry, Vocabulary } from "@/contracts";
import type { CircuitBreaker, ModelEntry, ModelTarget } from "@/lib/models";
import { modelBreaker, answerEntry, delay, isServerError, shouldFallBack, runRoute } from "@/lib/models";
import { counterSnapshot, recordOutcome } from "./modelCounters";
import type { Embedder } from "@/lib/models/embedder";
import { languageModel } from "@/lib/models/modelProviders";
import { toolMessage, STAGE_MESSAGES } from "@/lib/conversation";
import type { Bm25Index, VectorStore } from "@/lib/search";
import { errorEvent } from "./answerErrors";
import type { RequestLog } from "./requestLog";
import { brief, modelLabel } from "./requestLog";
import { EmptyAnswerError, runLoop } from "./answerLoop";
import { buildInstructions, buildMessages } from "./answerPrompt";
import { ResultStore } from "./toolResults";
import { createTools } from "./tools/toolSet";
import { buildView, UnverifiedAnswerError } from "./answerView";

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
  /** The longest wait before the one retry after a 5xx; tests pass 0. @default 1000 */
  retryJitterMs?: number;
  /** The answer entry a request names; tests pass entries of their own (a fallback, say). @default answerEntry */
  entries?: (id: AnswerModelId) => ModelEntry | undefined;
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
  const { pool, modelFor = languageModel, breaker = modelBreaker, retryJitterMs = 1_000, entries = answerEntry } = deps;
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
    modelFailures: [],
    candidatesReturned: [],
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

  const entry: ModelEntry | undefined = entries(request.model);
  if (!entry) {
    finish("error", new Error(`Model ${request.model} is not offered`));
    emit({ type: "error", message: "That model isn't available. Choose another one.", retryable: false });
    return;
  }

  try {
    emit({ type: "progress", stage: "understand", message: STAGE_MESSAGES.understand });
    // One model, with the single quick retry after a 5xx (an overloaded upstream, say) before the
    // fallback (PLAN, Reliability); nothing has reached the recruiter yet, and the two attempts are
    // one strike for the breaker.
    const run = async (target: ModelTarget) => {
      for (let retried = false; ; retried = true) {
        const store = new ResultStore(previousIds.length);
        const tools = createTools({ ...pool, embedder: deps.embedder, store: deps.store, previousIds, signal }, (result) => store.add(result));
        try {
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
            // A list or count is opened by the app's sentence; a profile or comparison needs the model's words.
            wantsText: () => !store.lastFilter && !store.lastSearch,
          });
          return { outcome, store };
        } catch (error) {
          if (retried || signal.aborted || !isServerError(error)) throw error;
          record.modelFailures.push({ model: modelLabel(target), reason: brief(error), then: "retried" });
          await delay(Math.random() * retryJitterMs, signal);
        }
      }
    };
    const { value, target, fellBack } = await runRoute(entry, {
      breaker,
      signal,
      run,
      // A model that is down, silent or empty may not be the next one's problem; a bad answer is not retried elsewhere.
      canSwitch: (error) => error instanceof EmptyAnswerError || shouldFallBack(error),
      onFailure: (error, from, next) => {
        record.modelFailures.push({ model: modelLabel(from), reason: brief(error), then: next ? "fell back" : "gave up", ...(next ? { to: modelLabel(next) } : {}) });
      },
    });
    const { outcome, store } = value;
    record.model = { requested: request.model, used: outcome.modelId ?? target.model, provider: outcome.provider, fellBack };
    record.candidatesReturned = [...store.knownIds];
    if (outcome.presentForced) record.presentForced = true;
    if (outcome.textRewritten) record.textRewritten = true;

    emit({ type: "progress", stage: "write", message: STAGE_MESSAGES.write });
    const built = outcome.present ? buildView(outcome.present, store, byId) : undefined;
    // A count is the app's sentence: the model's words could only restate or contradict it.
    let text = outcome.text;
    if (text && built?.view.kind === "list" && built.view.count) {
      built.corrections.push("The model's text was dropped: a count is the app's sentence");
      text = "";
    }
    if (built) record.presentation = { view: built.view.kind === "status" ? built.view.status : built.view.kind, candidates: built.sources.length, corrections: built.corrections };
    if (text) emit({ type: "delta", text });
    const answeredBy = { model: request.model, name: fellBack ? (entry.fallback ? fallbackName(entry, entries) : target.model) : entry.displayName, fellBack };
    recordOutcome(modelLabel(target), true);
    finish("answer");
    emit({
      type: "answer",
      text,
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
    if (error instanceof UnverifiedAnswerError) record.rejectedCandidates = [...error.ids];
    recordOutcome(modelLabel(entry), false);
    finish("error", error);
    emit(errorEvent(error));
  }
}

/** The display name of the entry's fallback: the answer entry that pins the same model, if any. */
function fallbackName(entry: ModelEntry, entries: (id: AnswerModelId) => ModelEntry | undefined): string {
  const fallback = entry.fallback;
  if (!fallback) return entry.displayName;
  const named = entries("alternative");
  return named && named.model === fallback.model ? named.displayName : fallback.model;
}
