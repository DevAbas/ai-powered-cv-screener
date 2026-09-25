import { User } from "lucide-react";
import { capHeightBox } from "@/components/ui/recipe";

export interface CandidateNameProps {
  name: string;
}

/** A candidate, as a person icon and their name, wherever an answer names one. */
export function CandidateName({ name }: CandidateNameProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-headline-md leading-headline-md font-(weight:--font-weight-headline-md) text-on-surface">
      {/* DESIGN.md, Icons: 1.25rem beside a headline, on-surface-variant at rest */}
      <User aria-hidden className="size-5 shrink-0 text-on-surface-variant" />
      {/* Trimmed to its capitals, so the icon centres on the letters, not the line box. */}
      <span className={capHeightBox}>{name}</span>
    </span>
  );
}
