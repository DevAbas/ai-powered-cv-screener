import type { AnswerCandidate } from "@/contracts/answer";
import type { OpenSource } from "./source-link";
import { SourceLink } from "./source-link";

export interface AnswerListProps {
  candidates: readonly AnswerCandidate[];
  /** Rank answers: best first, numbered. */
  ordered?: boolean;
  onOpenSource: OpenSource;
}

/** Filter, rank and count lists: one candidate per row with its reason and source. */
export function AnswerList({ candidates, ordered = false, onOpenSource }: AnswerListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="divide-y divide-outline">
      {candidates.map((c, i) => (
        <li key={c.candidateId} className="flex gap-3 py-2">
          {ordered && <span className="w-4 shrink-0 text-label-md leading-label-md font-(weight:--font-weight-label-md) text-on-surface-variant tabular-nums">{i + 1}</span>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <SourceLink candidateId={c.candidateId} name={c.name} page={c.page} onOpen={onOpenSource} />
            <p className="text-body-sm leading-body-sm text-on-surface-variant">{c.reason}</p>
          </div>
        </li>
      ))}
    </Tag>
  );
}
