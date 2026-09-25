import { CandidateIdSchema } from "@/contracts";

/** The readable file name a CV downloads as: `<name>_<surname>_cv.pdf`, from the candidate id. */
export function cvFileName(candidateId: string): string {
  return `${candidateId.replace(/-/g, "_")}_cv.pdf`;
}

/**
 * Where a cited source opens: the CV through the CV route, at the cited
 * page. Undefined for an id or page that cannot name a
 * CV, so the source stays plain text.
 */
export function cvSourceHref(candidateId: string, page: number): string | undefined {
  if (!CandidateIdSchema.safeParse(candidateId).success) return undefined;
  if (!Number.isInteger(page) || page < 1) return undefined;
  return `/api/cvs/${candidateId}#page=${page}`;
}
