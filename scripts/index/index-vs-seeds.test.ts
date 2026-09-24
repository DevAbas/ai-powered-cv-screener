import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CandidateSeedSchema } from "@/contracts/candidate";
import { INDEX_FILE, IndexSchema } from "@/lib/pool/index-file";
import { normalizeLanguages, normalizeSkills } from "@/lib/pool/normalize";
import { seedPath } from "../generate/fs";

// The committed index checked against the seeds its PDFs were rendered from
// (PLAN, Build order: Indexer): every fact the PDF prints.

const index = existsSync(INDEX_FILE) ? IndexSchema.parse(JSON.parse(readFileSync(INDEX_FILE, "utf8"))) : [];
const seeded = index.filter((entry) => existsSync(seedPath(entry.id)));

const sorted = (values: readonly string[]) => [...values].sort();

describe.runIf(seeded.length > 0)("index against seeds", () => {
  it.each(seeded.map((entry) => [entry.id, entry] as const))("%s matches its seed", (_id, entry) => {
    const seed = CandidateSeedSchema.parse(JSON.parse(readFileSync(seedPath(entry.id), "utf8")));
    const profile = entry.profile;

    expect(profile.name).toBe(seed.name);
    expect(profile.headline).toBe(seed.headline);
    expect(profile.role).toBe(seed.role);
    expect(profile.seniority).toBe(seed.seniority);
    expect(profile.location).toBe(seed.location);
    expect(sorted(profile.remote)).toEqual(sorted(seed.remote));
    expect(profile.workAuthorization).toBe(seed.workAuthorization);
    expect(profile.availability).toBe(seed.availability);
    expect(profile.yearsTotal).toBe(seed.yearsTotal);
    const bySkill = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    expect([...profile.skills].sort(bySkill)).toEqual(normalizeSkills(seed.skills).sort(bySkill));
    expect(normalizeLanguages(seed.languages)).toEqual(expect.arrayContaining(profile.languages));
    expect(profile.languages).toHaveLength(seed.languages.length);
    expect(profile.education).toEqual(seed.education);
    expect(profile.employment).toEqual(
      seed.employment.map(({ company, title, industry, from, to }) => ({ company, title, industry, from, to })),
    );
    expect(profile.leadership.has).toBe(seed.leadership.has);
    expect(sorted(profile.certifications)).toEqual(sorted(seed.certifications));
    expect(entry.pages).toBe(entry.text.length);
  });
});
