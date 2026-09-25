import type { AnsweredBy, AnswerMatched } from "@/contracts";
import { ThoughtLine } from "@/components/ui/ThoughtLine";

export interface AnswerProgressStep {
  stage: string;
  message: string;
}

export interface AnswerProgressProps {
  steps: readonly AnswerProgressStep[];
  /** What the search did, for the settled line; null when no CV was searched. */
  matched?: AnswerMatched | null;
  /** Which model answered; the settled line names a fallback. */
  answeredBy?: AnsweredBy;
  /**
   * The request is still running; false settles the line into what the search did.
   * @default true
   */
  working?: boolean;
  /** Swaps in the neutral "Taking longer than usual…" line. */
  slow?: boolean;
  /**
   * How the request ended, for the settled line: only an answer says what the search did.
   * @default "answered"
   */
  outcome?: AnswerProgressOutcome;
}

export type AnswerProgressOutcome = "answered" | "stopped" | "failed";

const STARTING = "Understanding the question…";
const SLOW = "Taking longer than usual…";

/** The settled line, in plain words for a non-technical reader (DESIGN.md, Progress line). */
export function settledLabel(matched: AnswerMatched | null | undefined, answeredBy?: AnsweredBy): string {
  const cvs = (n: number) => `${n} ${n === 1 ? "CV" : "CVs"}`;
  const what = !matched ? "Answered" : matched.kind === "read" ? `Read ${cvs(matched.count)}` : `Matched ${matched.count} of ${cvs(matched.total)}`;
  return answeredBy?.fellBack ? `${what} · answered by ${answeredBy.name}` : what;
}

const SETTLED: Record<Exclude<AnswerProgressOutcome, "answered">, string> = {
  stopped: "Stopped searching",
  failed: "The search didn't finish",
};

/** One line that reads the current stage of the request and settles into what the search did. */
export function AnswerProgress({ steps, matched, answeredBy, working = true, slow = false, outcome = "answered" }: AnswerProgressProps) {
  const current = steps[steps.length - 1]?.message ?? STARTING;
  const done = outcome === "answered" ? settledLabel(matched, answeredBy) : SETTLED[outcome];
  return <ThoughtLine working={working} label={slow ? SLOW : current} doneLabel={done} showTimer={false} />;
}
