import type { AnswerCandidate } from "@/contracts/answer";
import { AnswerCandidateList } from "./AnswerCandidateList";
import type { SourceHref } from "./CvSourceLink";

export interface AnswerCountProps {
  count: number;
  candidates?: readonly AnswerCandidate[];
  sourceHref?: SourceHref | undefined;
}

/** The exact count, then the list when the answer includes it. */
export function AnswerCount({ count, candidates, sourceHref }: AnswerCountProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-headline-lg leading-headline-lg tracking-headline-lg font-(weight:--font-weight-headline-lg) text-on-surface tabular-nums">
        {count} <span className="text-body-md leading-body-md text-on-surface-variant">{count === 1 ? "candidate" : "candidates"}</span>
      </p>
      {candidates?.length ? <AnswerCandidateList candidates={candidates} sourceHref={sourceHref} /> : null}
    </div>
  );
}
