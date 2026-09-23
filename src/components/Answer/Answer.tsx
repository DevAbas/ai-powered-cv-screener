import type { Answer as AnswerData } from "@/contracts/answer";
import { StatusMessage } from "@/components/ui/StatusMessage";
import type { StatusMessageProps } from "@/components/ui/StatusMessage";
import { AnswerComparison } from "./AnswerComparison";
import { AnswerCount } from "./AnswerCount";
import { AnswerFact } from "./AnswerFact";
import { AnswerCandidateList } from "./AnswerCandidateList";
import { AnswerProfile } from "./AnswerProfile";
import type { SourceHref } from "./CvSourceLink";

export interface AnswerProps {
  answer: AnswerData;
  nameOf: (id: string) => string;
  sourceHref?: SourceHref | undefined;
}

const STATE_KINDS: Partial<Record<AnswerData["kind"], StatusMessageProps["status"]>> = {
  empty: "empty",
  insufficient: "insufficient",
  out_of_scope: "out-of-scope",
};

/** Renders each answer kind in its own shape (PRD, Answers). */
export function Answer({ answer, nameOf, sourceHref }: AnswerProps) {
  const state = STATE_KINDS[answer.kind];
  if (state) return <StatusMessage status={state}>{answer.summary}</StatusMessage>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-headline-md leading-headline-md font-(weight:--font-weight-headline-md) text-on-surface">{answer.summary}</p>
      {(answer.kind === "filter" || answer.kind === "rank") && answer.candidates && (
        <AnswerCandidateList candidates={answer.candidates} ordered={answer.kind === "rank"} sourceHref={sourceHref} />
      )}
      {answer.kind === "count" && answer.count !== undefined && (
        <AnswerCount count={answer.count} candidates={answer.candidates} sourceHref={sourceHref} />
      )}
      {answer.comparison && <AnswerComparison comparison={answer.comparison} nameOf={nameOf} sourceHref={sourceHref} />}
      {answer.fact && <AnswerFact fact={answer.fact} nameOf={nameOf} sourceHref={sourceHref} />}
      {answer.profile && <AnswerProfile profile={answer.profile} nameOf={nameOf} sourceHref={sourceHref} />}
    </div>
  );
}
