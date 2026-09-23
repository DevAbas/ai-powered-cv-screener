"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { Answer as AnswerData } from "@/contracts/answer";
import { IconButton } from "@/components/ui/button";
import { Answer } from "../answer";
import type { OpenSource } from "../answer";
import { ErrorLine } from "./error-line";
import { Progress } from "./progress";
import type { ProgressStep } from "./progress";

export type TurnStatus = "running" | "answered" | "error" | "stopped";

export interface TurnProps {
  question: string;
  status: TurnStatus;
  steps: readonly ProgressStep[];
  slow?: boolean;
  answer?: AnswerData;
  error?: { message: string; retryable: boolean };
  nameOf: (id: string) => string;
  onOpenSource: OpenSource;
  onRetry: () => void;
  /** Copies the answer as plain text (PRD, Core flow: Exit). */
  onCopy: () => Promise<void>;
}

const COPIED_MS = 2_000;

/** One question and what came back for it: progress, then an answer or an error. */
export function Turn({ question, status, steps, slow, answer, error, nameOf, onOpenSource, onRetry, onCopy }: TurnProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <article className="flex flex-col gap-3">
      <h2 className="text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface-variant">{question}</h2>
      {status === "running" && <Progress steps={steps} slow={slow} />}
      {status === "stopped" && <p className="text-body-sm leading-body-sm text-on-surface-variant">Stopped.</p>}
      {status === "error" && error && <ErrorLine message={error.message} retryable={error.retryable} onRetry={onRetry} />}
      {status === "answered" && answer && (
        <>
          <Answer answer={answer} nameOf={nameOf} onOpenSource={onOpenSource} />
          <div className="-ml-2 flex">
            <IconButton aria-label={copied ? "Copied" : "Copy answer"} variant="ghost" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </IconButton>
          </div>
        </>
      )}
    </article>
  );
}
