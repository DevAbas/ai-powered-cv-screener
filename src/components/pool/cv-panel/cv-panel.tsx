import { ArrowLeft, FileText } from "lucide-react";
import type { PoolCandidate } from "@/lib/pool/candidate";
import { IconButton } from "@/components/ui/button";

export interface CvPanelProps {
  candidate: PoolCandidate;
  /** 1-based page the source points to. */
  page: number;
  onBack: () => void;
}

/**
 * The selected CV. A placeholder until the PDFs exist (Generation phase):
 * it shows who and which page a source points to.
 */
export function CvPanel({ candidate, page, onBack }: CvPanelProps) {
  return (
    <section aria-label={`${candidate.profile.name}'s CV`} className="flex flex-col gap-4">
      <header className="flex items-start gap-2">
        <IconButton aria-label="Back to the pool" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden />
        </IconButton>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-headline-md leading-headline-md font-(weight:--font-weight-headline-md) text-on-surface">{candidate.profile.name}</h2>
          <p className="truncate text-body-sm leading-body-sm text-on-surface-variant">
            {candidate.profile.headline} · {candidate.profile.location}
          </p>
        </div>
      </header>
      <div className="flex flex-col items-center gap-2 rounded-md bg-surface-container-lowest px-6 py-16 text-center">
        <FileText aria-hidden className="size-5 text-on-surface-variant" />
        <p className="text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface">
          Page {page} of {candidate.pages}
        </p>
        <p className="text-body-sm leading-body-sm text-on-surface-variant">The CV preview appears here once the PDFs are generated.</p>
      </div>
    </section>
  );
}
