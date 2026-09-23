import type { AnswerCandidate } from "@/contracts/answer";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

export interface AnswerCandidateListProps {
  candidates: readonly AnswerCandidate[];
  /** Rank answers: best first, numbered. */
  ordered?: boolean;
  sourceHref?: SourceHref | undefined;
}

/** Filter, rank and count lists: one candidate per row with its reason and source. */
export function AnswerCandidateList({ candidates, ordered = false, sourceHref }: AnswerCandidateListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="divide-y divide-outline">
      {candidates.map((c, i) => (
        <li key={c.candidateId} className="flex gap-3 py-2">
          {ordered && <span className="w-4 shrink-0 text-label-md leading-label-md font-(weight:--font-weight-label-md) text-on-surface-variant tabular-nums">{i + 1}</span>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <CvSourceLink candidateId={c.candidateId} name={c.name} page={c.page} sourceHref={sourceHref} />
            <p className="text-body-sm leading-body-sm text-on-surface-variant">{c.reason}</p>
          </div>
        </li>
      ))}
    </Tag>
  );
}
