import { Fragment } from "react";
import type { CSSProperties, Ref } from "react";

/** The headline's words before the highlighted one; each rises one word-stagger after the last. */
const LEAD_WORDS = ["Find", "The", "Right"] as const;

export interface ChatEmptyStateProps {
  poolSize: number;
  /** The headline block, for the grid behind it to keep clear of. */
  ref?: Ref<HTMLDivElement>;
}

/** Entry: the CV count under the headline, never a blank screen (PRD, Core flow; DESIGN.md, Empty state). */
export function ChatEmptyState({ poolSize, ref }: ChatEmptyStateProps) {
  return (
    <div ref={ref} className="flex flex-col items-center gap-3 text-center">
      {/* DESIGN.md, Layout: motion. The words rise one after another; "Candidates" last, its highlight growing to the middle of the word as it appears; on hover, to the whole word. */}
      <h2 className="text-display leading-display tracking-display font-(weight:--font-weight-display) text-on-surface">
        {/* The spaces sit between the word boxes: an inline-block drops its own trailing space. */}
        {LEAD_WORDS.map((word, i) => (
          <Fragment key={word}>
            <span
              className="inline-block motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--empty-state-word-stagger)*var(--word-index))]"
              style={{ "--word-index": i } as CSSProperties}
            >
              {word}
            </span>{" "}
          </Fragment>
        ))}
        <span
          className={[
            "relative isolate inline-block px-1.5",
            "motion-safe:animate-rise motion-safe:[animation-delay:var(--empty-state-word-delay)]",
            "before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-50 before:rounded-md before:bg-primary dark:before:bg-primary-outline",
            "before:transition-transform before:duration-(--empty-state-highlight-hover) hover:before:scale-y-100",
            "motion-safe:before:animate-highlight-grow motion-safe:before:[animation-delay:var(--empty-state-word-delay)]",
          ].join(" ")}
        >
          Candidates
        </span>
      </h2>
      <p className="motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--empty-state-word-delay)+var(--empty-state-stagger))] text-body-lg leading-body-lg text-on-surface-variant">
        You currently have {poolSize} {poolSize === 1 ? "CV" : "CVs"} to review.
      </p>
    </div>
  );
}
