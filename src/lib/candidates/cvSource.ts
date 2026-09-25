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

/**
 * A weak validator for a CV file from its size and modification time, the
 * way nginx and Apache derive theirs (RFC 9110, ETag): a regenerated PDF
 * gets a new tag, so a browser holding the old one downloads again.
 */
export function cvEtag(size: number, mtimeMs: number): string {
  return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

/** Whether an If-None-Match header names the tag (RFC 9110): a list of tags, or `*`. */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(",").some((candidate) => candidate.trim() === "*" || candidate.trim() === etag);
}
