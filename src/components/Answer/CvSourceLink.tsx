import { Link } from "@/components/ui/Link";

/**
 * Where a source points: the CV's PDF at the cited page (PLAN, User
 * interface). Returns undefined while no PDF exists, and the source is text.
 */
export type SourceHref = (candidateId: string, page: number) => string | undefined;

export interface CvSourceLinkProps {
  candidateId: string;
  name: string;
  page: number;
  sourceHref?: SourceHref | undefined;
}

/** The CV an answer came from, by name and cited page (PRD, Sources). */
export function CvSourceLink({ candidateId, name, page, sourceHref }: CvSourceLinkProps) {
  const label = (
    <>
      {name}
      <span className="text-on-surface-variant"> · p. {page}</span>
    </>
  );
  const href = sourceHref?.(candidateId, page);
  if (!href) return <span className="text-on-surface">{label}</span>;
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}'s CV at page ${page} in a new tab`}>
      {label}
    </Link>
  );
}
