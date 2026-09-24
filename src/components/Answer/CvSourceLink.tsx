"use client";

import { useState } from "react";
import { PdfIcon } from "@/components/ui/Icons";
import { cvFileName } from "@/lib/pool/source-href";
import { cx, focusVisibleRing } from "@/lib/recipe";
import { useOpenSource } from "./SourceContext";

/**
 * Where a source points: the CV's PDF at the cited page (PLAN, User
 * interface). Returns undefined while no PDF exists, and the source is text.
 */
export type SourceHref = (candidateId: string, page: number) => string | undefined;

export interface CvSourceLinkProps {
  candidateId: string;
  /** For the accessible name only; the visible label is the file name. */
  name: string;
  page: number;
  sourceHref?: SourceHref | undefined;
}

/**
 * The candidate's CV as a file card (DESIGN.md, Components: File card): the
 * PDF icon, the file name, and "PDF" that becomes "Open file" on hover.
 * Inside an `OpenSourceProvider` it opens the app's preview at the cited
 * page; otherwise the PDF opens in a new tab (PRD, Sources).
 */
export function CvSourceLink({ candidateId, name, page, sourceHref }: CvSourceLinkProps) {
  const [hovered, setHovered] = useState(false);
  const open = useOpenSource();
  const href = sourceHref?.(candidateId, page);
  const fileName = cvFileName(candidateId);
  // DESIGN.md, File card: the PDF icon, 1.5rem; its band is primary, the document the text colour.
  const icon = <PdfIcon aria-hidden className="size-6 text-on-surface" />;
  const body = (subtext: string) => (
    <span className="flex min-w-0 flex-col gap-0.5 text-left">
      <span className="truncate text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface">{fileName}</span>
      <span className="text-body-sm leading-body-sm text-on-surface-variant">{subtext}</span>
    </span>
  );
  // DESIGN.md `file-card`, `file-card-hover`, `file-card-pressed`
  const card =
    "inline-flex w-(--container-file-card) max-w-full items-center gap-2.5 self-start rounded-md border border-outline bg-surface-container-lowest px-2.5 py-2 shadow-soft transition-[background-color,box-shadow]";
  const active = cx(card, "cursor-pointer hover:bg-surface-container-low active:bg-surface-container active:shadow-none", focusVisibleRing);
  const hoverProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };
  const label = `Open ${name}'s CV at page ${page}`;

  if (!href) {
    return (
      <span className={card}>
        {icon}
        {body("CV not available")}
      </span>
    );
  }
  if (open) {
    return (
      <button type="button" aria-label={label} className={active} {...hoverProps} onClick={() => open({ candidateId, name, page })}>
        {icon}
        {body(hovered ? "Open file" : "PDF")}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} in a new tab`} className={active} {...hoverProps}>
      {icon}
      {body(hovered ? "Open file" : "PDF")}
    </a>
  );
}
