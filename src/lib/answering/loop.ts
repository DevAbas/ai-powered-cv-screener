import { generateText, hasToolCall, InvalidToolInputError, isStepCount, NoSuchToolError, streamText } from "ai";
import type { LanguageModel, ModelMessage } from "ai";
import type { PresentInput } from "@/contracts/tools";
import { STEP_LIMIT, TIMEOUTS } from "./config";
import type { StepLog, ToolCallLog } from "./log";
import { brief, summarize } from "./log";
import type { AnswerTools } from "./tools";

// One model's answer loop (PLAN, Retrieval and answering: steps). The model
// calls tools until it ends with `present` (a tool without execute, so the
// loop stops) or with text alone; at most STEP_LIMIT steps. An input that
// fails its schema is repaired once by re-asking the same model
// (`repairToolCall`, AI SDK docs); if that fails, the SDK returns the error
// to the model as a tool result in the next step. Text is kept per step and
// only the final step's text is the answer.

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
}

export interface LoopResult {
  text: string;
  present?: PresentInput;
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

export async function runLoop(model: LanguageModel, request: LoopRequest): Promise<LoopResult> {
  const { tools, signal } = request;
  let streamError: unknown;
  const toolStarts = new Map<string, number>();
  let stepNumber = 0;

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
      request.onToolCall({
        step: stepNumber,
        tool: toolCall.toolName,
        input: toolCall.input,
        ok: toolOutput.type === "tool-result",
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
          if (!part.invalid) present = part.input as PresentInput;
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

  if (present) return { text: finalText ?? "", present, ...outcome };
  if (finalText === undefined) throw new StepLimitError(steps);
  if (!finalText.trim()) throw new EmptyAnswerError();
  return { text: finalText, ...outcome };
}
