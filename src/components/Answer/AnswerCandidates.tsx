"use client";

import { ChevronDown, ChevronUp, User } from "lucide-react";
import { useState } from "react";
import type { TransitionEvent } from "react";
import type { AnswerView, CandidateRow } from "@/contracts";
import { listCaption, skillLabel } from "@/lib/conversation";
import { cx } from "@/components/ui/recipe";
import type { SourceHref } from "./CvSourceLink";
import { cardClass, CvSourceLink } from "./CvSourceLink";

type ListView = Extract<AnswerView, { kind: "list" }>;

/** Rows shown before "Show all": a full pair of columns (DESIGN.md, Answer views: Candidate list). */
export const DEFAULT_ROWS = 4;

/** The rows: one column, two from `sm`; each row carries its own 10px above and below (DESIGN.md, Answer views: Candidate list). */
const GRID = "grid gap-x-3 sm:grid-cols-2";

/** Tailwind's `motion-safe:`; when it does not hold, the fold has no transition to wait for. */
const MOTION_SAFE = "(prefers-reduced-motion: no-preference)";

export interface AnswerCandidatesProps {
  view: ListView;
  sourceHref?: SourceHref | undefined;
}

interface RowProps {
  row: CandidateRow;
  index: number;
  ranked: boolean;
  sourceHref: SourceHref | undefined;
}

/** One candidate on four lines: the name, the title from the CV, the years asked about, the resume. */
function Row({ row, index, ranked, sourceHref }: RowProps) {
  return (
    <li className="flex gap-3 py-2.5">
      {ranked && (
        <span className="w-4 shrink-0 text-label-md leading-label-lg font-(weight:--font-weight-label-md) text-on-surface-variant tabular-nums">{index + 1}</span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex min-w-0 items-center gap-x-2">
          {/* DESIGN.md, Icons: the person mark at the text size, on-surface-variant */}
          <User aria-hidden className="size-4 shrink-0 text-on-surface-variant" />
          {/* DESIGN.md `name`: the name leads the row */}
          <span className="text-name leading-name font-(weight:--font-weight-name) text-on-surface">{row.name}</span>
        </p>
        <p className="pl-6 text-body-sm leading-body-sm text-on-surface-variant">{row.headline}</p>
        {row.skills.length > 0 && <p className="pl-6 text-body-sm leading-body-sm text-on-surface tabular-nums">{row.skills.map(skillLabel).join(" · ")}</p>}
        {row.reason && <p className="pl-6 text-body-sm leading-body-sm text-on-surface-variant">{row.reason}</p>}
        {/* Shifted left by the card's padding and border, so its icon sits on the text column above it. */}
        <div className="pl-6 -ml-[calc(--spacing(2)+1px)]">
          <CvSourceLink compact candidateId={row.candidateId} name={row.name} page={row.page} sourceHref={sourceHref} />
        </div>
      </div>
    </li>
  );
}

/**
 * DESIGN.md, Answer views: Candidate list. The app's opening sentence, then
 * one compact row per candidate, on a panel. Four rows show by default; a
 * control in the file card's style unfolds the rest (200ms, decelerate) and
 * folds them again (150ms, accelerate), never under reduced motion; folded
 * rows are inert. A ranked list numbers its rows and keeps the model's
 * reason under each.
 */
export function AnswerCandidates({ view, sourceHref }: AnswerCandidatesProps) {
  const [showAll, setShowAll] = useState(false);
  // The rest are clipped while folded and while they unfold; once unfolded
  // they are not, so the last row's file card can show its tooltip below them.
  const [unfolded, setUnfolded] = useState(false);
  const caption = listCaption(view);
  const first = view.rows.slice(0, DEFAULT_ROWS);
  const rest = view.rows.slice(DEFAULT_ROWS);
  const Rows = view.ranked ? "ol" : "ul";

  function toggle() {
    const open = !showAll;
    setShowAll(open);
    // Under reduced motion the rows unfold at once: there is no transition end to wait for.
    setUnfolded(open && !window.matchMedia(MOTION_SAFE).matches);
  }

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && event.propertyName === "grid-template-rows" && showAll) setUnfolded(true);
  }

  return (
    <section aria-label={caption ?? "Candidates"} className="flex flex-col gap-3">
      {/* DESIGN.md `candidate-list`: the panel that holds the sentence and the rows, the low surface at 60% over the page */}
      <div className="flex flex-col gap-3 rounded-md bg-surface-container-low/60 p-4">
        {caption && <p className="text-body-md leading-body-md text-on-surface">{caption}</p>}
        {first.length > 0 && (
          <div>
            <Rows className={GRID}>
              {first.map((row, i) => (
                <Row key={row.candidateId} row={row} index={i} ranked={view.ranked} sourceHref={sourceHref} />
              ))}
            </Rows>
            {rest.length > 0 && (
              // The rest fold and unfold by height and opacity (DESIGN.md, Answer views: Candidate list).
              <div
                inert={!showAll}
                aria-hidden={!showAll}
                onTransitionEnd={handleTransitionEnd}
                className={cx(
                  "grid motion-safe:transition-[grid-template-rows,opacity]",
                  showAll ? "[grid-template-rows:1fr] opacity-100 motion-safe:duration-200 motion-safe:ease-(--ease-decelerate)" : "[grid-template-rows:0fr] opacity-0 motion-safe:duration-150 motion-safe:ease-(--ease-accelerate)",
                )}
              >
                <div className={cx("min-h-0", unfolded ? "overflow-visible" : "overflow-hidden")}>
                  <Rows start={DEFAULT_ROWS + 1} className={GRID}>
                    {rest.map((row, i) => (
                      <Row key={row.candidateId} row={row} index={DEFAULT_ROWS + i} ranked={view.ranked} sourceHref={sourceHref} />
                    ))}
                  </Rows>
                </div>
              </div>
            )}
          </div>
        )}
        {rest.length > 0 && (
          <div className="flex justify-center">
            {/* The list's own action, in the file card's style (DESIGN.md, Answer views: Candidate list) */}
            <button
              type="button"
              aria-expanded={showAll}
              className={cx(cardClass(true, true), "text-label-md leading-label-md font-(weight:--font-weight-label-md) text-on-surface")}
              onClick={toggle}
            >
              {showAll ? (
                <>
                  Show fewer
                  <ChevronUp aria-hidden className="size-4" />
                </>
              ) : (
                <>
                  Show all {view.rows.length}
                  <ChevronDown aria-hidden className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
