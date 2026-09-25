// The candidates module (AGENTS.md, Conventions): the pool and each
// candidate's verified profile, imported from `@/lib/candidates`. Names are
// listed, not `export *`: the scripts run as ES modules and Node only sees
// the names a CommonJS module declares itself. `candidatePool.ts` and `indexFiles.ts`
// are not here: they read the file system, and this index is imported by
// client components; the routes and the scripts import them by their path.

export { chunkId, pageChunks, pageTexts, sectionPages } from "./cvChunks";

export { cvFileName, cvSourceHref } from "./cvSource";

export { buildIndexEntry } from "./indexEntry";
export type { BuiltEntry } from "./indexEntry";

export type { PoolCandidate } from "./poolCandidate";

export { aliasKey, normalizeSkill, normalizeLanguage, normalizeSkills, normalizeLanguages, normalizeProfile } from "./candidateProfile";

export { headingOf, splitSections } from "./cvSections";

export { yearMonthOf, medianTenureMonths } from "./jobTenure";

export { locate, locateIn, verifyProfile } from "./profileVerification";
export type { Located, ExtractionEvidence, Verified } from "./profileVerification";

export { splitLocation, vocabularyOf } from "./poolVocabulary";
