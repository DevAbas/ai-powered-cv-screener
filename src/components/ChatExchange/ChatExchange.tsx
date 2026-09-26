"use client";

import type { AnsweredBy, AnswerMatched, AnswerStatus, AnswerView as View } from "@/contracts";
import { StatusMessage } from "@/components/ui/StatusMessage";
import type { StatusMessageProps } from "@/components/ui/StatusMessage";
import { AnswerText, AnswerView } from "@/components/Answer";
import type { SourceHref } from "@/components/Answer";
import { statusText } from "@/lib/conversation";
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
  /** The answer so far while it streams; the whole answer once answered. */
  text: string;
  /** The data under the answer, drawn from the CVs; shown once it is complete. */
  view?: View | undefined;
  /** What the search did; null when no CV was searched. */
  matched?: AnswerMatched | null;
  /** Which model answered. */
  answeredBy?: AnsweredBy;
  error?: { message: string; retryable: boolean };
  sourceHref?: SourceHref | undefined;
  onRetry: () => void;
}

/** DESIGN.md, States: the state line for each answer state. */
const STATE_LINE: Record<AnswerStatus, NonNullable<StatusMessageProps["status"]>> = {
  "no-match": "empty",
  insufficient: "insufficient",
  "out-of-scope": "out-of-scope",
};

/** One question and what came back for it: progress, the answer as it is written, its view, or an error. */
export function ChatExchange({ question, status, steps, slow, text, view, matched, answeredBy, error, sourceHref, onRetry }: ChatExchangeProps) {
  const answered = status === "answered";
  const state = answered && view?.kind === "status" ? view.status : undefined;
  // A profile the model did not open in words is opened by the app's sentence.
  const written = text.trim() ? text : answered && view?.kind === "profile" ? view.lead : "";

  return (
    <article className="flex min-w-0 flex-col gap-5 wrap-anywhere">
      <QuestionBubble>{question}</QuestionBubble>
      {/*
        The progress line sits between the question and the answer: one
        instance from start to finish, the current step while running, then
        what the search did.
      */}
      {(status === "running" || steps.length > 0) && (
        <AnswerProgress
          steps={steps}
          matched={matched}
          answeredBy={answeredBy}
          working={status === "running"}
          slow={slow}
          outcome={status === "error" ? "failed" : status === "stopped" ? "stopped" : "answered"}
        />
      )}
      {/*
        The text appears as it is written, and stays if the request is stopped
        or fails part-way. A state, once the answer is complete, is its words
        behind the state's icon.
      */}
      {state && view?.kind === "status" ? (
        <StatusMessage status={STATE_LINE[state]}>{[view.lead, text.trim()].filter(Boolean).join(" ") || statusText(state)}</StatusMessage>
      ) : (
        written && <AnswerText text={written} />
      )}
      {answered && view && <AnswerView view={view} sourceHref={sourceHref} />}
      {status === "stopped" && <p className="text-body-sm text-on-surface-variant">Stopped.</p>}
      {status === "error" && error && <AnswerError message={error.message} retryable={error.retryable} onRetry={onRetry} />}
    </article>
  );
}
