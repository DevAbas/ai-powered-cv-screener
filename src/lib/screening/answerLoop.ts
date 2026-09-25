import { generateText, hasToolCall, InvalidToolInputError, isStepCount, NoSuchToolError, streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import type { PresentInput } from "@/contracts";
import { STEP_LIMIT, TIMEOUTS } from "./answerLimits";
import type { StepLog, ToolCallLog } from "./requestLog";
import { brief, summarize } from "./requestLog";
import type { AnswerTools } from "./tools/toolSet";

// One model's answer loop. The model
// calls tools until it ends with `present` (a tool without execute, so the
// loop stops) or with text alone; at most STEP_LIMIT steps. An input that
// fails its schema is repaired once by re-asking the same model
// (`repairToolCall`, AI SDK docs); if that fails, the SDK returns the error
// to the model as a tool result in the next step. Text is kept per step and
// only the final step's text is the answer, with the chat template's
// tool-call tags stripped. Ending in text after a tool returned candidates
// is not finished: one more call, with `present` as the tool choice, asks
// for the presentation. When the view needs words (a profile, a
// comparison) and the model gave none, or gave them only in that failed
// step, one call asks for them; a list or count is opened by the app
// itself.

export interface LoopRequest {
  instructions: string;
  messages: ModelMessage[];
  tools: AnswerTools;
  signal: AbortSignal;
  /** A data tool started: the progress line names it. */
  onTool: (toolName: string, input: unknown) => void;
  /** Every step and tool call, for the log. */
  onStep: (step: StepLog) => void;
  onToolCall: (call: ToolCallLog) => void;
  onRepair: () => void;
  /** After a forced presentation: whether the answer still needs the model's text (a profile, a comparison) or the app opens the view (a list, a count). */
  wantsText: () => boolean;
}

export interface LoopResult {
  text: string;
  present?: PresentInput;
  /** The model ended in text after tools ran; the presentation came from the forced call. */
  presentForced?: true;
  /** The text written in that failed step was replaced by a re-asked one. */
  textRewritten?: true;
  modelId?: string;
  /** The upstream provider OpenRouter routed to, from its usage accounting. */
  provider?: string;
  steps: number;
}

/** The model returned neither text nor a presentation. */
export class EmptyAnswerError extends Error {
  constructor() {
    super("The model returned no text and no presentation");
    this.name = "EmptyAnswerError";
  }
}

/** The step bound was reached with tools still being called. */
export class StepLimitError extends Error {
  constructor(steps: number) {
    super(`No answer within ${steps} model steps`);
    this.name = "StepLimitError";
  }
}

const DATA_TOOLS = new Set(["find_candidates", "count_candidates", "get_candidates", "search_cv_text"]);

/** Sent when the model ended in text after tools ran: the answer is about candidates and needs its presentation. */
const PRESENT_NUDGE =
  "Your answer is about candidates, so it needs its presentation. Call present now: the view, the candidates you named by id with the pages the tool results cite, and the skills the question is about. Write no text.";

/** Sent when the view needs words the model did not give: after a forced presentation, or a wordless profile or comparison. */
const REWRITE_NUDGE =
  "The presentation is done. Now write only the answer for the recruiter: two or three plain sentences on what was asked, a summary if a summary was asked, otherwise the fact, experience or difference the question is about. No lists, no profile dump, no JSON, no tool calls.";

/**
 * The tool-call markers of the pinned models' chat templates (Nemotron 3
 * and Qwen3 wrap a call in `<tool_call>…</tool_call>`, per their model
 * cards). A provider that extracts the call can leak the tags into the text.
 */
const TEMPLATE_TAGS = ["<tool_call>", "</tool_call>"];

export function stripTemplateTags(text: string): string {
  return TEMPLATE_TAGS.reduce((cleaned, tag) => cleaned.replaceAll(tag, ""), text).trim();
}

export async function runLoop(model: LanguageModel, request: LoopRequest): Promise<LoopResult> {
  const { tools, signal } = request;
  let streamError: unknown;
  const toolStarts = new Map<string, number>();
  let stepNumber = 0;
  let dataResults = 0;

  const result = streamText({
    model,
    instructions: request.instructions,
    messages: request.messages,
    tools,
    stopWhen: [hasToolCall("present"), isStepCount(STEP_LIMIT)],
    timeout: TIMEOUTS,
    maxRetries: 0,
    abortSignal: signal,
    // Errors reach the caller through the stream; the SDK's own console dump would repeat each one.
    onError: ({ error }) => {
      streamError ??= error;
    },
    repairToolCall: async ({ toolCall, tools: toolSet, error, messages, instructions }) => {
      if (NoSuchToolError.isInstance(error)) return null;
      if (!InvalidToolInputError.isInstance(error)) return null;
      request.onRepair();
      // The re-ask strategy (AI SDK docs, Tool Call Repair): the failed call and its error go back once.
      const repaired = await generateText({
        model,
        instructions,
        messages: [
          ...messages,
          { role: "assistant", content: [{ type: "tool-call", toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, input: toolCall.input }] },
          { role: "tool", content: [{ type: "tool-result", toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, output: { type: "error-text", value: error.message } }] },
        ],
        tools: toolSet,
        maxRetries: 0,
        abortSignal: signal,
      });
      const fixed = repaired.toolCalls.find((call) => call.toolName === toolCall.toolName);
      return fixed ? { type: "tool-call", toolCallId: toolCall.toolCallId, toolName: toolCall.toolName, input: JSON.stringify(fixed.input) } : null;
    },
    onToolExecutionStart: ({ toolCall }) => {
      toolStarts.set(toolCall.toolCallId, performance.now());
    },
    onToolExecutionEnd: ({ toolCall, toolOutput }) => {
      const started = toolStarts.get(toolCall.toolCallId);
      const ms = started === undefined ? undefined : Math.round(performance.now() - started);
      const ok = toolOutput.type === "tool-result";
      if (ok && DATA_TOOLS.has(toolCall.toolName)) dataResults += 1;
      request.onToolCall({
        step: stepNumber,
        tool: toolCall.toolName,
        input: toolCall.input,
        ok,
        detail: toolOutput.type === "tool-result" ? summarize(toolCall.toolName, toolOutput.output) : brief(toolOutput.error),
        ms,
      });
    },
    onStepEnd: (step) => {
      request.onStep({
        step: step.stepNumber,
        finishReason: step.finishReason,
        modelId: step.response.modelId,
        usage: { inputTokens: step.usage.inputTokens, outputTokens: step.usage.outputTokens },
      });
    },
  });

  let stepText = "";
  let stepHadDataTool = false;
  let finalText: string | undefined;
  let present: PresentInput | undefined;
  let presentCallId = "";
  let steps = 0;

  for await (const part of result.stream) {
    switch (part.type) {
      case "start-step":
        stepText = "";
        stepHadDataTool = false;
        break;
      case "text-delta":
        stepText += part.text;
        break;
      case "tool-input-start":
        if (DATA_TOOLS.has(part.toolName)) request.onTool(part.toolName, undefined);
        break;
      case "tool-call":
        if (part.toolName === "present") {
          if (!part.invalid) {
            present = part.input as PresentInput;
            presentCallId = part.toolCallId;
          }
        } else {
          stepHadDataTool = true;
          if (!part.invalid) request.onTool(part.toolName, part.input);
        }
        if (part.invalid) {
          request.onToolCall({ step: stepNumber, tool: part.toolName, input: part.input, ok: false, detail: brief(part.error) });
        }
        break;
      case "finish-step":
        steps += 1;
        stepNumber += 1;
        // The step with `present`, or a step that called no tool, holds the answer text.
        if (present !== undefined || !stepHadDataTool) finalText = stepText;
        break;
      case "error":
        throw part.error;
    }
  }
  if (streamError !== undefined) throw streamError;
  if (signal.aborted) throw signal.reason;

  const finalStep = await result.finalStep;
  const provider = finalStep.providerMetadata?.openrouter as { provider?: unknown } | undefined;
  const outcome = { modelId: finalStep.response.modelId, provider: typeof provider?.provider === "string" ? provider.provider : undefined, steps };

  if (present) {
    const text = stripTemplateTags(finalText ?? "");
    // The view needs words and the model gave none: one call asks for them.
    if (!text && request.wantsText()) {
      const rewritten = await rewriteText(model, request, [...(await result.responseMessages), presentDone(presentCallId)], stepNumber);
      if (rewritten !== undefined) return { text: rewritten, present, textRewritten: true, ...outcome, steps: steps + 1 };
    }
    return { text, present, ...outcome };
  }
  if (finalText === undefined) throw new StepLimitError(steps);
  if (dataResults > 0) {
    // Tools returned candidates and the model ended in text: the CVs and their
    // sources come only with a presentation, so one call asks for it, after
    // the loop's accumulated response messages (`responseMessages`, AI SDK 7).
    const prior = await result.responseMessages;
    const forced = await forcePresent(model, request, prior, stepNumber);
    if (forced) {
      // The text of the failed step is not the answer: a profile's is re-asked in a few sentences; a list is opened by the app.
      const rewritten = request.wantsText() ? await rewriteText(model, request, [...prior, ...forced.messages], stepNumber + 1) : undefined;
      const text = rewritten ?? (request.wantsText() ? stripTemplateTags(finalText) : "");
      return {
        text,
        present: forced.present,
        presentForced: true,
        ...(rewritten === undefined ? {} : { textRewritten: true as const }),
        ...outcome,
        modelId: forced.modelId ?? outcome.modelId,
        steps: steps + 1 + (rewritten === undefined ? 0 : 1),
      };
    }
  }
  if (!finalText.trim()) throw new EmptyAnswerError();
  return { text: stripTemplateTags(finalText), ...outcome };
}

/**
 * One call with `present` as the tool choice, after the conversation so far
 * and the model's own text. Undefined when the model does not comply or the
 * call fails; the log records it and the text stands as the answer.
 */
async function forcePresent(model: LanguageModel, request: LoopRequest, priorMessages: ModelMessage[], step: number): Promise<{ present: PresentInput; modelId?: string; messages: ModelMessage[] } | undefined> {
  try {
    const forced = await generateText({
      model,
      instructions: request.instructions,
      messages: [...request.messages, ...priorMessages, { role: "user", content: PRESENT_NUDGE }],
      tools: request.tools,
      toolChoice: { type: "tool", toolName: "present" },
      maxRetries: 0,
      abortSignal: request.signal,
    });
    request.onStep({ step, finishReason: forced.finishReason, modelId: forced.response.modelId, usage: { inputTokens: forced.usage.inputTokens, outputTokens: forced.usage.outputTokens } });
    const call = forced.toolCalls.find((candidate) => candidate.toolName === "present");
    if (!call) {
      request.onToolCall({ step, tool: "present", input: undefined, ok: false, detail: "The forced step made no present call" });
      return undefined;
    }
    return { present: call.input as PresentInput, modelId: forced.response.modelId, messages: [...forced.responseMessages, presentDone(call.toolCallId)] };
  } catch (error) {
    if (request.signal.aborted) throw error;
    request.onToolCall({ step, tool: "present", input: undefined, ok: false, detail: brief(error) });
    return undefined;
  }
}

/** `present` has no execute: the conversation gets its result here, or a later call is refused for the missing result. */
function presentDone(toolCallId: string): ModelMessage {
  return { role: "tool", content: [{ type: "tool-result", toolCallId, toolName: "present", output: { type: "text", value: "The presentation is done." } }] };
}

/** One call with no tools allowed, for the answer text alone; undefined when it fails or says nothing, which the log records. */
async function rewriteText(model: LanguageModel, request: LoopRequest, priorMessages: ModelMessage[], step: number): Promise<string | undefined> {
  try {
    const rewritten = await generateText({
      model,
      instructions: request.instructions,
      messages: [...request.messages, ...priorMessages, { role: "user", content: REWRITE_NUDGE }],
      tools: request.tools,
      toolChoice: "none",
      maxRetries: 0,
      abortSignal: request.signal,
    });
    request.onStep({ step, finishReason: rewritten.finishReason, modelId: rewritten.response.modelId, usage: { inputTokens: rewritten.usage.inputTokens, outputTokens: rewritten.usage.outputTokens } });
    return stripTemplateTags(rewritten.text) || undefined;
  } catch (error) {
    if (request.signal.aborted) throw error;
    request.onToolCall({ step, tool: "present", input: undefined, ok: false, detail: `Text rewrite: ${brief(error)}` });
    return undefined;
  }
}
