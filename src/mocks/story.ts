import { CandidateIdSchema } from "@/contracts";
import type { SourceHref } from "@/components/Answer";
import { findCandidate } from "./pool";

/** Resolves a mock candidate id to its name, for stories and the mock screen. */
export function mockNameOf(id: string): string {
  return findCandidate(id)?.profile.name ?? id;
}

/** Where a source opens in the component previews: the CV served statically from `data/cvs` (`.storybook/main.ts`). */
export const storySourceHref: SourceHref = (candidateId, page) => {
  if (!CandidateIdSchema.safeParse(candidateId).success || !Number.isInteger(page) || page < 1) return undefined;
  return `/cvs/${candidateId}.pdf#page=${page}`;
};
