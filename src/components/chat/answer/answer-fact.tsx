import type { Fact } from "@/contracts/answer";
import type { OpenSource } from "./source-link";
import { SourceLink } from "./source-link";

export interface AnswerFactProps {
  fact: Fact;
  nameOf: (id: string) => string;
  onOpenSource: OpenSource;
}

/** A short fact with its single source. */
export function AnswerFact({ fact, nameOf, onOpenSource }: AnswerFactProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-body-md leading-body-md text-on-surface">{fact.text}</p>
      <div>
        <SourceLink candidateId={fact.candidateId} name={nameOf(fact.candidateId)} page={fact.page} onOpen={onOpenSource} />
      </div>
    </div>
  );
}
