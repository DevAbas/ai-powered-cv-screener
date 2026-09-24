import type { AskEvent, AskRequest, ProgressStage } from "@/contracts/ask";
import type { IndexEntry } from "@/contracts/candidate";
import type { Embedder } from "@/lib/ai/embedder";
import { getEntry } from "@/lib/ai/registry";
import type { ModelEntry } from "@/lib/ai/registry";
import type { StreamTextOptions, StreamTextRequest, StreamTextResult } from "@/lib/ai/stream-text";
import { EmptyAnswerError } from "@/lib/ai/stream-text";
import { readingMessage, STAGE_MESSAGES } from "@/lib/ask/stages";
import type { VectorStore } from "@/lib/vector/vector-store";
import type { RetrievalConfig } from "./config";
import { RETRIEVAL } from "./config";
import { errorEvent } from "./errors";
import type { QueryPlanner } from "./plan";
import { priorCandidateIds, promoteLookupPlan, resolveQueryPlan } from "./plan";
import { buildInstructions, buildMessages } from "./prompt";
import { retrieve } from "./retrieve";
import { VIEW_TOOLS } from "./tools";
import { buildView, viewSources } from "./views";

// One question, end to end: plan it (rules, else the model) → retrieve its
// CVs as the reference repo does → stream the answer, with at most one view
// tool call → build the view from the index. Emits progress, the text as it
// is written, then exactly one `answer` or `error`. Every collaborator is
// injected, so this composes and the parts are tested on their own.

export interface AnswerDeps {
  index: readonly IndexEntry[];
  embedder: Embedder;
  store: VectorStore;
  planQuery: QueryPlanner;
  streamAnswer: (entry: ModelEntry, request: StreamTextRequest, options: StreamTextOptions) => Promise<StreamTextResult>;
  retrieval?: RetrievalConfig;
  /** Diagnostics for the server log; never shown to the recruiter. */
  log?: (message: string) => void;
}

/** An error on one line, for the server log. Whole: Google's quota errors name the limit and when to retry after the first line. */
function brief(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message.replace(/\s+/g, " ").slice(0, 500)}` : String(error);
}

export async function answerQuestion(request: AskRequest, emit: (event: AskEvent) => void, deps: AnswerDeps, signal: AbortSignal): Promise<void> {
  const { index, log = () => {} } = deps;
  const started = performance.now();
  const at = () => `${Math.round(performance.now() - started)} ms`;
  const stage = (s: ProgressStage, message = STAGE_MESSAGES[s]) => emit({ type: "progress", stage: s, message });
  const byId = new Map(index.map((entry) => [entry.id, entry]));

  try {
    stage("search");
    const priorIds = priorCandidateIds(request.history).filter((id) => byId.has(id));
    const priorNames = priorIds.flatMap((id) => byId.get(id)?.profile.name ?? []);
    const planned = await resolveQueryPlan(request.question, request.history, { ids: priorIds, names: priorNames }, deps.planQuery, signal);
    const plan = promoteLookupPlan(planned, request.question);
    log(`plan: ${plan.intent} "${plan.searchQuery}"${plan.candidateName ? ` for ${plan.candidateName}` : ""} at ${at()}`);

    const retrieved = await retrieve(plan, request.question, priorIds, deps, deps.retrieval ?? RETRIEVAL, signal);
    log(`${plan.intent}: ${retrieved.length} CVs (${retrieved.map((r) => `${r.entry.id} ${r.score.toFixed(2)}`).join(", ")}) at ${at()}`);
    if (retrieved.length > 0) stage("read", readingMessage(retrieved.length));

    stage("write");
    const result = await deps.streamAnswer(
      getEntry(request.model),
      { instructions: buildInstructions(index, retrieved, plan.intent), messages: buildMessages(request.history, request.question), tools: VIEW_TOOLS },
      {
        signal,
        onDelta: (text) => emit({ type: "delta", text }),
        onRetry: (error, target) => log(`${target.model}: trying again at ${at()} (${brief(error)})`),
        onFailure: (error, target, next) => log(`${target.model} failed at ${at()} (${brief(error)})${next ? `; ${next.model} takes over` : ""}`),
      },
    );
    const view = result.toolCall ? buildView(result.toolCall, retrieved) : undefined;
    const shown = view ? `a ${view.kind} view` : result.toolCall ? `text; ${result.toolCall.toolName} dropped` : "text";
    log(`answered by ${result.target.model} at ${at()}${result.fellBack ? ", fallback" : ""}, with ${shown}`);
    // A call whose candidates were all unknown leaves nothing to show.
    if (!result.text.trim() && !view) throw new EmptyAnswerError();
    emit({ type: "answer", text: result.text, view, sources: viewSources(view), checked: retrieved.length });
  } catch (error) {
    if (signal.aborted) return;
    log(`failed at ${at()}: ${brief(error)}`);
    emit(errorEvent(error));
  }
}
