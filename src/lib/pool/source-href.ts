import { CandidateIdSchema } from "@/contracts/candidate";

/** The CV's file name in `public/cvs`: `<name>_<surname>_cv.pdf`, from the candidate id. */
export function cvFileName(candidateId: string): string {
  return `${candidateId.replace(/-/g, "_")}_cv.pdf`;
}

/** The candidate id a CV file name stands for; undefined for any other file. */
export function cvIdFromFileName(fileName: string): string | undefined {
  const match = /^(.+)_cv\.pdf$/.exec(fileName);
  const id = match?.[1].replace(/_/g, "-");
  return id && CandidateIdSchema.safeParse(id).success ? id : undefined;
}

/**
 * Where a cited source opens: the CV's PDF at the cited page, served from
 * `public/cvs` (PLAN, User interface). Undefined for an id or page that
 * cannot name a file, so the source stays plain text.
 */
export function cvSourceHref(candidateId: string, page: number): string | undefined {
  if (!CandidateIdSchema.safeParse(candidateId).success) return undefined;
  if (!Number.isInteger(page) || page < 1) return undefined;
  return `/cvs/${cvFileName(candidateId)}#page=${page}`;
}
