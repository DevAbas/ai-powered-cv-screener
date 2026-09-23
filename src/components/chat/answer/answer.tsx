import type { Answer as AnswerData } from "@/contracts/answer";
import { StateLine } from "@/components/ui/state-line";
import type { StateLineProps } from "@/components/ui/state-line";
import { AnswerCompare } from "./answer-compare";
import { AnswerCount } from "./answer-count";
import { AnswerFact } from "./answer-fact";
import { AnswerList } from "./answer-list";
import { AnswerProfile } from "./answer-profile";
import type { OpenSource } from "./source-link";

export interface AnswerProps {
  answer: AnswerData;
  nameOf: (id: string) => string;
  onOpenSource: OpenSource;
}

const STATE_KINDS: Partial<Record<AnswerData["kind"], StateLineProps["status"]>> = {
  empty: "empty",
  insufficient: "insufficient",
  out_of_scope: "out-of-scope",
};

/** Renders each answer kind in its own shape (PRD, Answers). */
export function Answer({ answer, nameOf, onOpenSource }: AnswerProps) {
  const state = STATE_KINDS[answer.kind];
  if (state) return <StateLine status={state}>{answer.summary}</StateLine>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-headline-md leading-headline-md font-(weight:--font-weight-headline-md) text-on-surface">{answer.summary}</p>
      {(answer.kind === "filter" || answer.kind === "rank") && answer.candidates && (
        <AnswerList candidates={answer.candidates} ordered={answer.kind === "rank"} onOpenSource={onOpenSource} />
      )}
      {answer.kind === "count" && answer.count !== undefined && (
        <AnswerCount count={answer.count} candidates={answer.candidates} onOpenSource={onOpenSource} />
      )}
      {answer.comparison && <AnswerCompare comparison={answer.comparison} nameOf={nameOf} onOpenSource={onOpenSource} />}
      {answer.fact && <AnswerFact fact={answer.fact} nameOf={nameOf} onOpenSource={onOpenSource} />}
      {answer.profile && <AnswerProfile profile={answer.profile} nameOf={nameOf} onOpenSource={onOpenSource} />}
    </div>
  );
}
