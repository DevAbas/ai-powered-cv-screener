import type { CandidateProfile } from "@/contracts/candidate";
import { CandidateProfileSchema } from "@/contracts/candidate";
import { getEntry } from "@/lib/ai/registry";
import type { ModelTarget } from "@/lib/ai/registry";
import { withRetry } from "@/lib/ai/retry";
import type { RetryOptions } from "@/lib/ai/retry";
import type { CallBudget } from "@/lib/ai/structured";
import { runStructured } from "@/lib/ai/structured";
import { normalizeProfile, normalizeRole } from "@/lib/pool/normalize";

// One structured profile per CV from the `extract` entry (PLAN, Indexer),
// normalised so filters match regardless of how the CV words a skill.

/** A whole CV profile is long output; the reasoning stream counts as first output. */
const EXTRACT_BUDGET: CallBudget = { firstOutputMs: 60_000, totalMs: 240_000 };
/** Patient backoff: an overloaded free model and a per-minute limit both clear within this. */
const RETRY: RetryOptions = { attempts: 3, baseMs: 5_000, maxMs: 60_000 };

export const EXTRACT_INSTRUCTIONS = [
  "Extract the candidate profile from the CV text. Use only facts stated in the CV; never guess.",
  "Copy names, titles, companies, institutions, skills and certifications exactly as written, with their capitalisation.",
  "- headline: the role line under the name, as written.",
  "- role and seniority: from the headline.",
  "- remote: every work mode the CV lists (onsite, hybrid, remote, relocation).",
  "- workAuthorization: as written, e.g. \"EU Citizen\".",
  "- availability: the notice period in days; 0 when available immediately.",
  "- yearsTotal: the total years of experience the CV states.",
  "- skills: every skill listed, name as written without the years; years only when the CV states them, as in \"React (7 years)\".",
  "- languages: every language with its CEFR level (A1-C2) or native.",
  "- education: degree (BSc is bachelor, MSc is master, PhD is doctorate), field, institution, graduation year.",
  "- employment: most recent first; dates as YYYY-MM (\"Mar 2022\" is 2022-03); to is null for \"Present\"; industry from the job's \"Industry:\" line.",
  "- leadership: has is true when the CV describes leading or mentoring people; note says how, in a few words.",
  "- certifications: every certification, as written.",
].join("\n");

/** The CV text with page markers, as the model reads it. */
export function extractPrompt(pages: readonly string[]): string {
  return pages.map((text, i) => `--- Page ${i + 1} ---\n${text}`).join("\n\n");
}

export interface Extracted {
  profile: CandidateProfile;
  target: ModelTarget;
  repaired: boolean;
}

export async function extractProfile(
  pages: readonly string[],
  log: (message: string) => void,
): Promise<Extracted> {
  const { output, target, repaired } = await withRetry(
    () =>
      runStructured(
        getEntry("extract"),
        {
          schema: CandidateProfileSchema,
          name: "candidate_profile",
          instructions: EXTRACT_INSTRUCTIONS,
          prompt: extractPrompt(pages),
          onRepair: (issues) => log(`schema failure, repairing:\n${issues}`),
        },
        { budget: EXTRACT_BUDGET, onFallback: (_error, fallback) => log(`falling back to ${fallback.model}`) },
      ),
    {
      ...RETRY,
      onRetry: (error, attempt, delayMs) =>
        log(`retry ${attempt} in ${Math.round(delayMs / 1000)} s (${error instanceof Error ? error.message.split("\n")[0] : String(error)})`),
    },
  );
  return { profile: normalizeProfile(checkAgainstText(dropUnstatedYears(output), pages.join("\n"))), target, repaired };
}

/**
 * The value as the CV writes it: the first case-insensitive match in the
 * text that has a capital letter (prose may repeat a title in lower case),
 * across line breaks; else the value unchanged.
 */
export function restoreCase(value: string, text: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return value;
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
  const match = [...text.matchAll(new RegExp(pattern, "gi"))].map((m) => m[0]).find((m) => /\p{Lu}/u.test(m));
  return match ? match.replace(/\s+/g, " ") : value;
}

/**
 * Deterministic checks on what the model returned: strings keep the CV's
 * capitalisation (a model sometimes lowercases a whole profile), and the
 * role follows the headline when the headline names one.
 */
export function checkAgainstText(profile: CandidateProfile, text: string): CandidateProfile {
  const cased = (value: string) => restoreCase(value, text);
  const headline = cased(profile.headline);
  const headlineRole = normalizeRole(headline);
  return {
    ...profile,
    name: cased(profile.name),
    headline,
    role: headlineRole === "other" ? profile.role : headlineRole,
    location: cased(profile.location),
    workAuthorization: cased(profile.workAuthorization),
    skills: profile.skills.map((skill) => ({ ...skill, name: cased(skill.name) })),
    education: profile.education.map((e) => ({ ...e, field: cased(e.field), institution: cased(e.institution) })),
    employment: profile.employment.map((job) => ({
      ...job,
      company: cased(job.company),
      title: cased(job.title),
      industry: cased(job.industry),
    })),
    leadership: profile.leadership,
    certifications: profile.certifications.map(cased),
  };
}

/** Models write `years: 0` for a skill whose years the CV does not state; that is no fact. */
export function dropUnstatedYears(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    skills: profile.skills.map(({ name, years }) => (years ? { name, years } : { name })),
  };
}
