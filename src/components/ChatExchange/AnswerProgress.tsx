import { ThoughtLine } from "@/components/ui/ThoughtLine";

export interface AnswerProgressStep {
  stage: string;
  message: string;
}

export interface AnswerProgressProps {
  steps: readonly AnswerProgressStep[];
  /** How many CVs the answer was written from, for the settled line. */
  checked?: number;
  /**
   * The request is still running; false settles the line into "Checked 8 CVs".
   * @default true
   */
  working?: boolean;
  /** Swaps in the neutral "Taking longer than usual…" line (PLAN, User interface). */
  slow?: boolean;
  /**
   * How the request ended, for the settled line: only an answer claims the CVs were checked.
   * @default "answered"
   */
  outcome?: AnswerProgressOutcome;
}

export type AnswerProgressOutcome = "answered" | "stopped" | "failed";

const STARTING = "Searching the CVs…";
const SLOW = "Taking longer than usual…";

/** The settled line, in plain words for a non-technical reader (DESIGN.md, Progress line). */
export function checkedLabel(checked = 0): string {
  if (checked === 0) return "Answered";
  return `Checked ${checked} ${checked === 1 ? "CV" : "CVs"}`;
}

const SETTLED: Record<Exclude<AnswerProgressOutcome, "answered">, string> = {
  stopped: "Stopped searching",
  failed: "The search didn't finish",
};

/** One line that reads the current stage of the request and settles into how many CVs were checked. */
export function AnswerProgress({ steps, checked, working = true, slow = false, outcome = "answered" }: AnswerProgressProps) {
  const current = steps[steps.length - 1]?.message ?? STARTING;
  const done = outcome === "answered" ? checkedLabel(checked) : SETTLED[outcome];
  return <ThoughtLine working={working} label={slow ? SLOW : current} doneLabel={done} showTimer={false} />;
}
