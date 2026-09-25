import { describe, expect, it } from "vitest";
import { LENA } from "@/mocks/sampleIndex";
import { ANDREI as ANDREI_SEED, LENA as LENA_SEED, TEST_SEEDS } from "../../evaluation/fixtures";
import { accuracyReport, compareEntry, formatAccuracy } from "../accuracy";
import { extractPrompt, splitEvidence } from "../extract";
import type { ExtractedProfile } from "../extract";
import { cleanPageText, joinSpacedCapitals } from "../pdfText";

describe("joinSpacedCapitals", () => {
  it.each([
    ["S U M M A RY", "SUMMARY"],
    ["E D U C AT I O N", "EDUCATION"],
    ["L A N G UAG E S", "LANGUAGES"],
    ["C E RT I F I C AT I O N S", "CERTIFICATIONS"],
    ["W O R K  E X P E R I E N C E", "WORK EXPERIENCE"],
  ])("%s → %s", (input, expected) => {
    expect(joinSpacedCapitals(input)).toBe(expected);
  });

  it("leaves ordinary lines alone", () => {
    expect(joinSpacedCapitals("AWS Certified Developer - Associate")).toBe("AWS Certified Developer - Associate");
    expect(joinSpacedCapitals("React · TypeScript")).toBe("React · TypeScript");
  });
});

describe("cleanPageText", () => {
  it("trims lines, drops blank ones and rejoins headings", () => {
    expect(cleanPageText("Lena Novak \n\n S K I L L S\nReact · TypeScript\n")).toBe("Lena Novak\nSKILLS\nReact · TypeScript");
  });
});

describe("extractPrompt", () => {
  it("marks every section of every page", () => {
    const prompt = extractPrompt(LENA.chunks);
    expect(prompt).toContain("[Page 1] [HEADER]\nLena Novak");
    expect(prompt).toContain("[Page 2] [EXPERIENCE]\nEXPERIENCE\nSenior Frontend Engineer");
  });
});

describe("splitEvidence", () => {
  it("separates the profile from the copied lines", () => {
    const extracted: ExtractedProfile = {
      ...LENA.profile,
      availabilityAsWritten: "Notice period: 30 days",
      yearsTotalAsWritten: "7 years",
      skills: [{ name: "React", years: 7, asWritten: "React (7 years)" }],
      languages: [{ language: "German", level: "native", asWritten: "German (native)" }],
      education: [{ ...LENA.profile.education[0], asWritten: "BSc Computer Science 2018" }],
      employment: [{ ...LENA.profile.employment[0], periodAsWritten: "Mar 2022 – Present" }],
    };
    const { profile, evidence } = splitEvidence(extracted);
    expect(profile.skills).toEqual([{ name: "React", years: 7 }]);
    expect(profile.employment[0]).not.toHaveProperty("periodAsWritten");
    expect(evidence).toEqual({
      availabilityAsWritten: "Notice period: 30 days",
      yearsTotalAsWritten: "7 years",
      skills: ["React (7 years)"],
      languages: ["German (native)"],
      education: ["BSc Computer Science 2018"],
      employment: ["Mar 2022 – Present"],
    });
  });
});

describe("accuracy", () => {
  it("compares every field with the seed and sums up per field and per CV", () => {
    // The seed the fixture CV would have been rendered from: the entry's profile plus the seed-only fields.
    const seeds = new Map([
      [
        "lena-novak",
        {
          ...LENA_SEED,
          ...LENA.profile,
          employment: LENA.profile.employment.map((job, i) => ({ ...LENA_SEED.employment[i]!, ...job })),
        },
      ],
    ]);
    const exact = compareEntry(LENA, seeds.get("lena-novak")!);
    expect(exact.skills).toBe(true);
    expect(exact.name).toBe(true);
    const report = accuracyReport([LENA], seeds);
    expect(report.cvs).toBe(1);
    expect(report.verified.total).toBeGreaterThan(0);
    expect(formatAccuracy(report)).toContain("verified sources");

    const wrong = accuracyReport([{ ...LENA, profile: { ...LENA.profile, yearsTotal: 8 } }], seeds);
    expect(wrong.mismatches).toEqual([{ id: "lena-novak", fields: ["yearsTotal"] }]);
    expect(wrong.passes).toBe(false);
    expect(accuracyReport([LENA], new Map([["andrei-popescu", ANDREI_SEED]])).unseeded).toEqual(["lena-novak"]);
    expect(TEST_SEEDS.size).toBe(3);
  });
});
