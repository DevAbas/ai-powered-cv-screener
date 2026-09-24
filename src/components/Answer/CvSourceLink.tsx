import { ExternalLink } from "lucide-react";
import { Link } from "@/components/ui/Link";

/**
 * Where a source points: the CV's PDF at the cited page (PLAN, User
 * interface). Returns undefined while no PDF exists, and the source is text.
 */
export type SourceHref = (candidateId: string, page: number) => string | undefined;

export interface CvSourceLinkProps {
  candidateId: string;
  /** For the accessible name only; the visible label is "Open CV". */
  name: string;
  page: number;
  sourceHref?: SourceHref | undefined;
}

/**
 * "Open CV" with a link mark: opens the candidate's PDF at the cited page
 * in a new tab (PRD, Sources). The name sits beside it, in `CandidateName`.
 */
export function CvSourceLink({ candidateId, name, page, sourceHref }: CvSourceLinkProps) {
  const href = sourceHref?.(candidateId, page);
  const label = "Open CV";
  if (!href) return <span className="text-label-sm leading-label-sm text-on-surface-variant">CV not available</span>;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${name}'s CV at page ${page} in a new tab`}
      className="inline-flex w-fit items-center gap-1 text-label-sm leading-label-sm font-(weight:--font-weight-label-sm)"
    >
      {label}
      {/* DESIGN.md, Icons: on-surface-variant at rest */}
      <ExternalLink aria-hidden className="size-3 shrink-0 text-on-surface-variant" />
    </Link>
  );
}
