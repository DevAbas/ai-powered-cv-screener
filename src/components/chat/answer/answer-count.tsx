import type { AnswerCandidate } from "@/contracts/answer";
import { AnswerList } from "./answer-list";
import type { OpenSource } from "./source-link";

export interface AnswerCountProps {
  count: number;
  candidates?: readonly AnswerCandidate[];
  onOpenSource: OpenSource;
}

/** The exact count, then the list when the answer includes it. */
export function AnswerCount({ count, candidates, onOpenSource }: AnswerCountProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-headline-lg leading-headline-lg tracking-headline-lg font-(weight:--font-weight-headline-lg) text-on-surface tabular-nums">
        {count} <span className="text-body-md leading-body-md text-on-surface-variant">{count === 1 ? "candidate" : "candidates"}</span>
      </p>
      {candidates?.length ? <AnswerList candidates={candidates} onOpenSource={onOpenSource} /> : null}
    </div>
  );
}
