"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Answer as AnswerData } from "@/contracts/answer";
import { IconButton } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { Answer } from "@/components/Answer";
import type { SourceHref } from "@/components/Answer";
import { AnswerError } from "./AnswerError";
import { AnswerProgress } from "./AnswerProgress";
import { QuestionBubble } from "./QuestionBubble";
import type { AnswerProgressStep } from "./AnswerProgress";

export type ExchangeStatus = "running" | "answered" | "error" | "stopped";

export interface ChatExchangeProps {
  question: string;
  status: ExchangeStatus;
  steps: readonly AnswerProgressStep[];
  slow?: boolean;
  answer?: AnswerData;
  error?: { message: string; retryable: boolean };
  nameOf: (id: string) => string;
  sourceHref?: SourceHref | undefined;
  onRetry: () => void;
  /** Copies the answer as plain text (PRD, Core flow: Exit). */
  onCopy: () => Promise<void>;
}

/** How long the Copy button shows its result before resetting. */
const COPY_FEEDBACK_MS = 2_000;

const COPY_LABELS = { idle: "Copy answer", copied: "Copied", failed: "Could not copy; try again" } as const;

/** One question and what came back for it: progress, then an answer or an error. */
export function ChatExchange({ question, status, steps, slow, answer, error, nameOf, sourceHref, onRetry, onCopy }: ChatExchangeProps) {
  const [copyState, setCopyState] = useState<keyof typeof COPY_LABELS>("idle");

  async function copy() {
    try {
      await onCopy();
      setCopyState("copied");
    } catch {
      // The clipboard can refuse (permission, unfocused window); say so instead of failing silently.
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
  }

  return (
    <article className="flex min-w-0 flex-col gap-5 wrap-anywhere">
      <QuestionBubble>{question}</QuestionBubble>
      {status === "running" && <AnswerProgress steps={steps} slow={slow} />}
      {status === "stopped" && <p className="text-body-sm leading-body-sm text-on-surface-variant">Stopped.</p>}
      {status === "error" && error && <AnswerError message={error.message} retryable={error.retryable} onRetry={onRetry} />}
      {status === "answered" && answer && (
        // The answer and its Copy action read as one block.
        <div className="flex flex-col gap-1">
          <Answer answer={answer} nameOf={nameOf} sourceHref={sourceHref} />
          <div className="-ml-1.75 flex">
            {/* The label repeats the button's name, so the trigger props are not spread. */}
            <Tooltip content={COPY_LABELS[copyState]} side="bottom">
              {() => (
                <IconButton aria-label={COPY_LABELS[copyState]} variant="ghost" size="xs" onClick={copy}>
                  {copyState === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
                </IconButton>
              )}
            </Tooltip>
            <span aria-live="polite" className="sr-only">
              {copyState === "idle" ? "" : COPY_LABELS[copyState]}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
