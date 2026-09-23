import { Check, Clock, LoaderCircle } from "lucide-react";
import { cx } from "@/theme/define-recipe";

export interface ProgressStep {
  stage: string;
  message: string;
}

export interface ProgressProps {
  steps: readonly ProgressStep[];
  /** Adds the neutral "Taking longer than usual…" line (PLAN, User interface). */
  slow?: boolean;
}

/** The stages of the running request; the last one is in progress. */
export function Progress({ steps, slow = false }: ProgressProps) {
  return (
    <ul aria-live="polite" aria-label="Progress" className="flex flex-col gap-1 text-body-sm leading-body-sm">
      {steps.map((step, i) => {
        const current = i === steps.length - 1;
        const Icon = current ? LoaderCircle : Check;
        return (
          <li key={step.stage} className={cx("flex items-center gap-2", current ? "text-on-surface" : "text-on-surface-variant")}>
            <Icon aria-hidden className={cx("size-4 shrink-0 text-on-surface-variant", current && "motion-safe:animate-spin")} />
            {step.message}
          </li>
        );
      })}
      {slow && (
        <li className="flex items-center gap-2 text-on-surface-variant">
          <Clock aria-hidden className="size-4 shrink-0" />
          Taking longer than usual…
        </li>
      )}
    </ul>
  );
}
