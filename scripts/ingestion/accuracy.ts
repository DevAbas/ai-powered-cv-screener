import type { CandidateSeed, IndexEntry } from "@/contracts";
import { normalizeLanguages, normalizeSkills } from "@/lib/candidates";

// The extraction accuracy check (PLAN, Indexer): every indexed profile
// against the seed its PDF was rendered from, field by field, and the share
// of sources found in the CV's text.

export const FIELD_THRESHOLD = 0.98;
export const VERIFIED_THRESHOLD = 0.98;

export const COMPARED_FIELDS = [
  "name",
  "headline",
  "role",
  "seniority",
  "location",
  "remote",
  "workAuthorization",
  "availability",
  "yearsTotal",
  "skills",
  "languages",
  "education",
  "employment",
  "leadership",
  "certifications",
] as const;
export type ComparedField = (typeof COMPARED_FIELDS)[number];

const sorted = (values: readonly string[]) => [...values].sort();
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const byLanguage = (a: { language: string }, b: { language: string }) => a.language.localeCompare(b.language);

/** Which fields of the entry's profile agree with the seed. */
export function compareEntry(entry: IndexEntry, seed: CandidateSeed): Record<ComparedField, boolean> {
  const p = entry.profile;
  return {
    name: p.name === seed.name,
    headline: p.headline === seed.headline,
    role: p.role === seed.role,
    seniority: p.seniority === seed.seniority,
    location: p.location === seed.location,
    remote: same(sorted(p.remote), sorted(seed.remote)),
    workAuthorization: p.workAuthorization === seed.workAuthorization,
    availability: p.availability === seed.availability,
    yearsTotal: p.yearsTotal === seed.yearsTotal,
    skills: same([...p.skills].sort(byName), normalizeSkills(seed.skills).sort(byName)),
    languages: same([...p.languages].sort(byLanguage), normalizeLanguages(seed.languages).sort(byLanguage)),
    education: same(p.education, seed.education),
    employment: same(
      p.employment,
      seed.employment.map(({ company, title, industry, from, to }) => ({ company, title, industry, from, to })),
    ),
    leadership: p.leadership.has === seed.leadership.has,
    certifications: same(sorted(p.certifications), sorted(seed.certifications)),
  };
}

export interface FieldAccuracy {
  field: ComparedField;
  correct: number;
  total: number;
}

export interface AccuracyReport {
  cvs: number;
  /** Entries without a seed, left out of the comparison. */
  unseeded: string[];
  fields: FieldAccuracy[];
  verified: { verified: number; total: number };
  mismatches: { id: string; fields: ComparedField[] }[];
  unverified: { id: string; fields: string[] }[];
  passes: boolean;
}

export function accuracyReport(entries: readonly IndexEntry[], seeds: ReadonlyMap<string, CandidateSeed>): AccuracyReport {
  const compared = entries.filter((entry) => seeds.has(entry.id));
  const fields = COMPARED_FIELDS.map((field) => ({ field, correct: 0, total: compared.length }));
  const mismatches: AccuracyReport["mismatches"] = [];
  for (const entry of compared) {
    const result = compareEntry(entry, seeds.get(entry.id)!);
    const wrong = COMPARED_FIELDS.filter((field) => !result[field]);
    for (const accuracy of fields) if (result[accuracy.field]) accuracy.correct += 1;
    if (wrong.length) mismatches.push({ id: entry.id, fields: wrong });
  }
  const sources = entries.flatMap((entry) => Object.entries(entry.sources));
  const verified = { verified: sources.filter(([, source]) => source.verified).length, total: sources.length };
  const unverified = entries
    .map((entry) => ({ id: entry.id, fields: Object.entries(entry.sources).filter(([, s]) => !s.verified).map(([field]) => field) }))
    .filter((item) => item.fields.length > 0);
  const fieldsPass = fields.every((f) => f.total === 0 || f.correct / f.total >= FIELD_THRESHOLD);
  const verifiedPass = verified.total === 0 || verified.verified / verified.total >= VERIFIED_THRESHOLD;
  return {
    cvs: compared.length,
    unseeded: entries.filter((entry) => !seeds.has(entry.id)).map((entry) => entry.id),
    fields,
    verified,
    mismatches,
    unverified,
    passes: compared.length > 0 && fieldsPass && verifiedPass,
  };
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((n / d) * 1000) / 10}%`);

export function formatAccuracy(report: AccuracyReport): string {
  const lines = [`Extraction accuracy over ${report.cvs} CV(s) with a seed${report.unseeded.length ? ` (no seed: ${report.unseeded.join(", ")})` : ""}:`];
  for (const f of report.fields) lines.push(`  ${f.field.padEnd(18)} ${pct(f.correct, f.total).padStart(6)}  (${f.correct}/${f.total})`);
  lines.push(`  ${"verified sources".padEnd(18)} ${pct(report.verified.verified, report.verified.total).padStart(6)}  (${report.verified.verified}/${report.verified.total})`);
  for (const m of report.mismatches) lines.push(`  ${m.id}: ${m.fields.join(", ")} differ from the seed`);
  for (const u of report.unverified) lines.push(`  ${u.id}: ${u.fields.join(", ")} not found in the CV text`);
  lines.push(report.passes ? `PASS: every field ≥ ${FIELD_THRESHOLD * 100}% and verified sources ≥ ${VERIFIED_THRESHOLD * 100}%` : "FAIL: below the PLAN thresholds");
  return lines.join("\n");
}
