// Options every step of the pipeline takes.

export const STEPS = ["seeds", "photos", "pdfs"] as const;
export type Step = (typeof STEPS)[number];

export interface StepOptions {
  /** Candidate ids to process; every roster entry when omitted. */
  only?: readonly string[];
  /** Regenerate what already exists. */
  force: boolean;
  /** Print the work without writing files or calling models. */
  dryRun: boolean;
}

export interface StepReport {
  step: Step;
  done: string[];
  skipped: string[];
  failed: string[];
}

export function log(step: Step, id: string, message: string): void {
  console.log(`${step} ${id}: ${message}`);
}

export function shortError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).split("\n")[0].slice(0, 200);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
