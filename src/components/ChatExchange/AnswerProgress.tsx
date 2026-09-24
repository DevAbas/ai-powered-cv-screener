import { ThoughtLine } from "@/components/ui/ThoughtLine";

export interface AnswerProgressStep {
  stage: string;
  message: string;
}

export interface AnswerProgressProps {
  steps: readonly AnswerProgressStep[];
  /**
   * The request is still running; false settles the line into "Searched for …".
   * @default true
   */
  working?: boolean;
  /** Swaps in the neutral "Taking longer than usual…" line (PLAN, User interface). */
  slow?: boolean;
}

const STARTING = "Searching the pool…";
const SLOW = "Taking longer than usual…";

/** One line that reads the current stage of the request and settles into how long it took. */
export function AnswerProgress({ steps, working = true, slow = false }: AnswerProgressProps) {
  const current = steps[steps.length - 1]?.message ?? STARTING;
  return <ThoughtLine working={working} label={slow ? SLOW : current} doneLabel="Searched for" />;
}
