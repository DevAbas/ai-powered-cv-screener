import { z } from "zod";
import type { CandidateProfile, Chunk } from "@/contracts";
import { CandidateProfileSchema, EducationSchema, EmploymentSchema, LanguageSchema, SkillSchema } from "@/contracts";
import { getEntry, withRetry } from "@/lib/models";
import type { ModelTarget, RetryOptions } from "@/lib/models";
import type { CallBudget, StructuredRequest } from "@/lib/models/structuredOutput";
import { runStructured } from "@/lib/models/structuredOutput";
import { normalizeProfile } from "@/lib/candidates";
import type { ExtractionEvidence } from "@/lib/candidates";

// One structured profile per CV from the `extract` entry. Beside each list
// entry the model copies the CV's own line, so numbers, levels and dates can
// be checked against the text (lib/candidates/profileVerification.ts).

/** A whole CV profile is long output; the reasoning stream counts as first output. */
const EXTRACT_BUDGET: CallBudget = { firstOutputMs: 60_000, totalMs: 240_000 };
/** Patient backoff: an overloaded free model and a per-minute limit both clear within this. */
const RETRY: RetryOptions = { attempts: 3, baseMs: 5_000, maxMs: 60_000 };

const asWritten = (example: string) => z.string().describe(`The entry as the CV prints it, e.g. "${example}"`);

/** The profile plus, per entry, the CV's own line. No `z.union`: providers' structured output rejects it. */
export const ExtractedProfileSchema = CandidateProfileSchema.extend({
  availabilityAsWritten: asWritten("Notice period: 30 days"),
  yearsTotalAsWritten: asWritten("7 years of professional experience"),
  skills: z.array(SkillSchema.extend({ asWritten: asWritten("React (7 years)") })),
  languages: z.array(LanguageSchema.extend({ asWritten: asWritten("English (C1)") })),
  education: z.array(EducationSchema.extend({ asWritten: asWritten("MSc Artificial Intelligence 2018") })),
  employment: z.array(EmploymentSchema.extend({ periodAsWritten: asWritten("Jun 2021 – Present") })).describe("Most recent first"),
});
export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

export const EXTRACT_INSTRUCTIONS = [
  "Extract the candidate profile from the CV text. Use only facts stated in the CV; never guess.",
  "Copy names, titles, companies, institutions, skills and certifications exactly as written. Every field marked 'as the CV prints it' is a verbatim copy of the CV's own words.",
  "- headline: the role line under the name, as written.",
  "- role and seniority: read from the headline.",
  "- remote: every work mode the CV lists (onsite, hybrid, remote, relocation).",
  "- workAuthorization: as written, e.g. \"EU Citizen\".",
  "- availability: the notice period in days; 0 when available immediately.",
  "- yearsTotal: the total years of experience the CV states.",
  "- skills: every skill listed, its name without the years; years only when the CV states them.",
  "- languages: every language with its CEFR level (A1-C2) or native.",
  "- education: degree (BSc is bachelor, MSc is master, PhD is doctorate), field, institution, graduation year.",
  "- employment: most recent first; dates as YYYY-MM (\"Mar 2022\" and \"03/2022\" are 2022-03); to is null for \"Present\"; industry from the job's \"Industry:\" line.",
  "- leadership: has is true only when the CV has a Leadership section; note is that section's text. Without the section, has is false and note is empty.",
  "- certifications: every certification, as written.",
].join("\n");

/** The CV as the model reads it: each section of each page behind its markers. */
export function extractPrompt(chunks: readonly Chunk[]): string {
  return chunks.map((chunk) => `[Page ${chunk.page}] [${chunk.section.toUpperCase()}]\n${chunk.text}`).join("\n\n");
}

/** The extraction call for one CV, as `npm run index` sends it. */
export function extractRequest(chunks: readonly Chunk[]): StructuredRequest<ExtractedProfile> {
  return { schema: ExtractedProfileSchema, name: "candidate_profile", instructions: EXTRACT_INSTRUCTIONS, prompt: extractPrompt(chunks) };
}

/** The profile the contract knows, and the copied lines that verify it. */
export function splitEvidence(extracted: ExtractedProfile): { profile: CandidateProfile; evidence: ExtractionEvidence } {
  const { availabilityAsWritten, yearsTotalAsWritten, skills, languages, education, employment, ...rest } = extracted;
  const profile = normalizeProfile({
    ...rest,
    skills: skills.map(({ name, years }) => (years === undefined ? { name } : { name, years })),
    languages: languages.map(({ language, level }) => ({ language, level })),
    education: education.map(({ degree, field, institution, year }) => ({ degree, field, institution, year })),
    employment: employment.map(({ company, title, industry, from, to }) => ({ company, title, industry, from, to })),
  });
  return {
    profile,
    evidence: {
      availabilityAsWritten,
      yearsTotalAsWritten,
      skills: skills.map((skill) => skill.asWritten),
      languages: languages.map((entry) => entry.asWritten),
      education: education.map((entry) => entry.asWritten),
      employment: employment.map((job) => job.periodAsWritten),
    },
  };
}

export interface Extracted {
  profile: CandidateProfile;
  evidence: ExtractionEvidence;
  target: ModelTarget;
  repaired: boolean;
}

export async function extractProfile(chunks: readonly Chunk[], log: (message: string) => void): Promise<Extracted> {
  const { output, target, repaired } = await withRetry(
    () =>
      runStructured(
        getEntry("extract"),
        { ...extractRequest(chunks), onRepair: (issues) => log(`schema failure, repairing:\n${issues}`) },
        { budget: EXTRACT_BUDGET, onFallback: (_error, fallback) => log(`falling back to ${fallback.model}`) },
      ),
    {
      ...RETRY,
      onRetry: (error, attempt, delayMs) =>
        log(`retry ${attempt} in ${Math.round(delayMs / 1000)} s (${error instanceof Error ? error.message.split("\n")[0] : String(error)})`),
    },
  );
  return { ...splitEvidence(output), target, repaired };
}
