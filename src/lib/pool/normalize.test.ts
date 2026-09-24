import { describe, expect, it } from "vitest";
import { aliasKey, normalizeLanguages, normalizeProfile, normalizeSkills } from "./normalize";

describe("aliasKey", () => {
  it("ignores case, spacing and punctuation but keeps + and #", () => {
    expect(aliasKey("Node.js")).toBe("nodejs");
    expect(aliasKey("C++")).toBe("c++");
    expect(aliasKey("c#")).toBe("c#");
    expect(aliasKey("HTML / CSS")).toBe("htmlcss");
  });
});

describe("normalizeSkills", () => {
  it("keeps names as written, tidies whitespace and merges duplicates keeping the most years", () => {
    expect(normalizeSkills([{ name: "React ", years: 3 }, { name: "react", years: 5 }, { name: "Go" }])).toEqual([
      { name: "React", years: 5 },
      { name: "Go" },
    ]);
  });
});

describe("normalizeLanguages", () => {
  it("merges duplicates keeping the highest level, native above C2", () => {
    expect(
      normalizeLanguages([
        { language: "German", level: "B2" },
        { language: "german", level: "native" },
        { language: "English", level: "C1" },
      ]),
    ).toEqual([
      { language: "German", level: "native" },
      { language: "English", level: "C1" },
    ]);
  });
});

describe("normalizeProfile", () => {
  it("tidies skills, languages and certifications and leaves the rest alone", () => {
    const profile = normalizeProfile({
      name: "Lena Novak",
      headline: "Senior Frontend Engineer",
      role: "frontend",
      seniority: "senior",
      location: "Berlin, Germany",
      remote: ["remote"],
      workAuthorization: "EU Citizen",
      availability: 30,
      yearsTotal: 7,
      skills: [{ name: "React" }, { name: "React", years: 7 }],
      languages: [{ language: "German", level: "native" }],
      education: [],
      employment: [],
      leadership: { has: false, note: "" },
      certifications: [" AWS Certified Developer ", "AWS Certified Developer"],
    });
    expect(profile.skills).toEqual([{ name: "React", years: 7 }]);
    expect(profile.certifications).toEqual(["AWS Certified Developer"]);
    expect(profile.role).toBe("frontend");
  });
});
