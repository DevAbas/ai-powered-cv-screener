"use client";

import { PdfIcon } from "@/components/ui/Icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { cx, focusVisibleRing } from "@/lib/recipe";
import { useOpenSource } from "./SourceContext";

/**
 * Where a source points: the CV's PDF at the cited page (PLAN, User
 * interface). Returns undefined while no PDF exists, and the source is text.
 */
export type SourceHref = (candidateId: string, page: number) => string | undefined;

export interface CvSourceLinkProps {
  candidateId: string;
  /** Shown on the button beside "CV", and always in its accessible name. */
  name: string;
  page: number;
  sourceHref?: SourceHref | undefined;
  /**
   * The icon and "CV" only, for a view row that already shows the name (DESIGN.md, File card).
   * @default false
   */
  compact?: boolean;
}

// DESIGN.md `file-card`, `file-card-hover`, `file-card-pressed`: the card as
// before, now as wide as its label.
const CARD =
  "inline-flex max-w-full items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-2.5 py-1.5 shadow-soft transition-[background-color,box-shadow]";
const ACTIVE = cx(CARD, "cursor-pointer hover:bg-surface-container-low active:bg-surface-container active:shadow-none", focusVisibleRing);

function Label({ name, note = "CV", compact }: { name: string; note?: string; compact: boolean }) {
  return (
    <>
      {/* DESIGN.md, File card: the PDF icon; its band is primary, the document the text colour. */}
      <PdfIcon aria-hidden className="size-5 shrink-0 text-on-surface" />
      {!compact && <span className="truncate text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface">{name}</span>}
      <span className="text-body-sm leading-body-sm text-on-surface-variant">{note}</span>
    </>
  );
}

/**
 * A candidate's CV as a compact file card: the PDF icon, the name and "CV",
 * with a "Preview CV" tooltip. Inside an `OpenSourceProvider` it opens the
 * app's preview at the cited page; otherwise the PDF opens in a new tab.
 */
export function CvSourceLink({ candidateId, name, page, sourceHref, compact = false }: CvSourceLinkProps) {
  const open = useOpenSource();
  const href = sourceHref?.(candidateId, page);
  const label = `Open ${name}'s CV at page ${page}`;

  if (!href) {
    return (
      <span aria-label={compact ? `${name}'s CV is not available` : undefined} className={CARD}>
        <Label name={name} note="CV not available" compact={compact} />
      </span>
    );
  }
  return (
    <Tooltip content={open ? "Preview CV" : "Open CV in a new tab"} side="bottom">
      {(trigger) =>
        open ? (
          <button type="button" aria-label={label} {...trigger} className={ACTIVE} onClick={() => open({ candidateId, name, page })}>
            <Label name={name} compact={compact} />
          </button>
        ) : (
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} in a new tab`} {...trigger} className={ACTIVE}>
            <Label name={name} compact={compact} />
          </a>
        )
      }
    </Tooltip>
  );
}
