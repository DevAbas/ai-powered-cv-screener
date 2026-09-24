import type { AnswerView } from "@/contracts/view";
import { listCaption, skillLabel } from "@/lib/answer-text";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

type ListView = Extract<AnswerView, { kind: "list" }>;

export interface AnswerCandidatesProps {
  view: ListView;
  sourceHref?: SourceHref | undefined;
}

/**
 * DESIGN.md, Answer views: Candidate list. Filter, rank, how many and one
 * fact: a caption with the count and the order, then one row per candidate
 * with their name, title and skill years from the CV, the compact file card,
 * and the model's reason beneath. A count shown without its list is the
 * caption alone.
 */
export function AnswerCandidates({ view, sourceHref }: AnswerCandidatesProps) {
  const caption = listCaption(view);
  const Rows = view.ranked ? "ol" : "ul";
  return (
    <section aria-label={caption ?? "Candidate"} className="flex flex-col gap-3">
      {caption && <p className="text-body-sm leading-body-sm text-on-surface-variant">{caption}</p>}
      {view.rows.length > 0 && (
      <Rows className="flex flex-col gap-5">
        {view.rows.map((row, i) => (
          <li key={row.candidateId} className="flex gap-3">
            {view.ranked && (
              <span className="w-4 shrink-0 text-label-md leading-label-lg font-(weight:--font-weight-label-md) text-on-surface-variant tabular-nums">
                {i + 1}
              </span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {/* On narrow screens the years and the card wrap under the name. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                  <span className="text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface">{row.name}</span>
                  <span className="text-body-sm leading-body-sm text-on-surface-variant">{row.headline}</span>
                </p>
                {row.skills.length > 0 && (
                  <span className="text-body-sm leading-body-sm text-on-surface tabular-nums">{row.skills.map(skillLabel).join(" · ")}</span>
                )}
                <CvSourceLink compact candidateId={row.candidateId} name={row.name} page={row.page} sourceHref={sourceHref} />
              </div>
              {row.reason && <p className="text-body-sm leading-body-sm text-on-surface-variant">{row.reason}</p>}
            </div>
          </li>
        ))}
      </Rows>
      )}
    </section>
  );
}
