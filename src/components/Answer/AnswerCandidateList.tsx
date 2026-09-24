import type { AnswerCandidate } from "@/contracts/answer";
import { CandidateName } from "./CandidateName";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

export interface AnswerCandidateListProps {
  candidates: readonly AnswerCandidate[];
  /** Rank answers: best first, numbered. */
  ordered?: boolean;
  sourceHref?: SourceHref | undefined;
}

/** Filter, rank and count lists: per candidate, the name, why they match in a sentence, and the way into their CV. */
export function AnswerCandidateList({ candidates, ordered = false, sourceHref }: AnswerCandidateListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="flex flex-col gap-5">
      {candidates.map((c, i) => (
        <li key={c.candidateId} className="flex gap-3">
          {ordered && (
            <span className="w-4 shrink-0 text-label-md leading-headline-md font-(weight:--font-weight-label-md) text-on-surface-variant tabular-nums">{i + 1}</span>
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <CandidateName name={c.name} />
            <p className="text-body-md leading-body-md text-on-surface-variant">{c.reason}</p>
            <CvSourceLink candidateId={c.candidateId} name={c.name} page={c.page} sourceHref={sourceHref} />
          </div>
        </li>
      ))}
    </Tag>
  );
}
