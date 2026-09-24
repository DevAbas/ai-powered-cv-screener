import type { Fact } from "@/contracts/answer";
import { CandidateName } from "./CandidateName";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

export interface AnswerFactProps {
  fact: Fact;
  nameOf: (id: string) => string;
  sourceHref?: SourceHref | undefined;
}

/** A short fact with its single source. */
export function AnswerFact({ fact, nameOf, sourceHref }: AnswerFactProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body-md leading-body-md text-on-surface">{fact.text}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CandidateName name={nameOf(fact.candidateId)} />
        <CvSourceLink candidateId={fact.candidateId} name={nameOf(fact.candidateId)} page={fact.page} sourceHref={sourceHref} />
      </div>
    </div>
  );
}
