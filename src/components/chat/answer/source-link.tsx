import { Link } from "@/components/ui/link";

export type OpenSource = (candidateId: string, page: number) => void;

export interface SourceLinkProps {
  candidateId: string;
  name: string;
  page: number;
  onOpen: OpenSource;
}

/** A compact, clickable reference to a CV page (PRD, Sources). */
export function SourceLink({ candidateId, name, page, onOpen }: SourceLinkProps) {
  return (
    <Link onClick={() => onOpen(candidateId, page)} aria-label={`Open ${name}'s CV at page ${page}`}>
      {name}
      <span className="text-on-surface-variant"> · p. {page}</span>
    </Link>
  );
}
