import type { CandidateProfile, IndexEntry } from "@/contracts";
import { splitSections } from "./cvSections";
import { medianTenureMonths, yearMonthOf } from "./jobTenure";
import type { ExtractionEvidence } from "./profileVerification";
import { verifyProfile } from "./profileVerification";

// An index entry from a CV's page texts and its extracted profile (PLAN,
// Indexer): the section chunks, the profile as the CV spells it, the
// source of every field, and the median job tenure.

export interface BuiltEntry {
  entry: IndexEntry;
  /** Field paths whose value was not found in the CV's text. */
  unverified: string[];
}

export function buildIndexEntry(
  id: string,
  pageTexts: readonly string[],
  profile: CandidateProfile,
  evidence: ExtractionEvidence = {},
  now: Date = new Date(),
): BuiltEntry {
  const chunks = splitSections(id, pageTexts);
  const verified = verifyProfile(profile, chunks, evidence);
  return {
    entry: {
      id,
      pages: pageTexts.length,
      chunks,
      profile: verified.profile,
      sources: verified.sources,
      medianTenureMonths: medianTenureMonths(verified.profile.employment, yearMonthOf(now)),
    },
    unverified: verified.unverified,
  };
}
