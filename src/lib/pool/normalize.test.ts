import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "@/contracts/candidate";
import {
  aliasKey,
  normalizeLanguage,
  normalizeLanguages,
  normalizeProfile,
  normalizeRole,
  normalizeSeniority,
  normalizeSkill,
  normalizeSkills,
} from "./normalize";

describe("aliasKey", () => {
  it("ignores case, whitespace and punctuation but keeps + and #", () => {
    expect(aliasKey(" React.JS ")).toBe("reactjs");
    expect(aliasKey("C++")).toBe("c++");
    expect(aliasKey("C#")).toBe("c#");
    expect(aliasKey("Français")).toBe("français");
  });
});

describe("normalizeSkill", () => {
  it.each([
    ["reactjs", "React"],
    ["React.js", "React"],
    ["REACT", "React"],
    ["ts", "TypeScript"],
    ["node", "Node.js"],
    ["NodeJS", "Node.js"],
    ["golang", "Go"],
    ["k8s", "Kubernetes"],
    ["postgres", "PostgreSQL"],
    ["react native", "React Native"],
    ["c sharp", "C#"],
    ["cpp", "C++"],
    ["dotnet", ".NET"],
    ["CI / CD", "CI/CD"],
    ["sklearn", "scikit-learn"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSkill(input)).toBe(expected);
  });

  it("keeps unknown skills, trimmed", () => {
    expect(normalizeSkill("  Obscure   Framework ")).toBe("Obscure Framework");
  });

  it("does not confuse C++ and C#", () => {
    expect(normalizeSkill("c++")).not.toBe(normalizeSkill("c#"));
  });
});

describe("normalizeLanguage", () => {
  it.each([
    ["Deutsch", "German"],
    ["german", "German"],
    ["Français", "French"],
    ["francais", "French"],
    ["Azeri", "Azerbaijani"],
    ["Mandarin", "Chinese"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeLanguage(input)).toBe(expected);
  });

  it("keeps unknown languages, trimmed", () => {
    expect(normalizeLanguage(" Klingon ")).toBe("Klingon");
  });
});

describe("normalizeRole", () => {
  it.each([
    ["Senior Frontend Engineer", "frontend"],
    ["Front-end Developer", "frontend"],
    ["Backend Developer (Java)", "backend"],
    ["Full-Stack Engineer", "fullstack"],
    ["React Native Developer", "mobile"],
    ["iOS Engineer", "mobile"],
    ["Data Engineer", "data"],
    ["Machine Learning Engineer", "data"],
    ["DevOps Engineer", "devops"],
    ["Site Reliability Engineer", "devops"],
    ["QA Automation Engineer", "qa"],
    ["Software Engineer in Test", "qa"],
    ["Application Security Engineer", "security"],
    ["Penetration Tester", "security"],
    ["Senior Product Manager", "product"],
    ["Product Owner", "product"],
    ["Office Manager", "other"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeRole(input)).toBe(expected);
  });
});

describe("normalizeSeniority", () => {
  it.each([
    ["Principal Engineer", "principal"],
    ["Staff Software Engineer", "principal"],
    ["Tech Lead", "lead"],
    ["Engineering Manager", "lead"],
    ["Senior Backend Developer", "senior"],
    ["Sr. QA Engineer", "senior"],
    ["Junior Data Analyst", "junior"],
    ["Middle Frontend Developer", "mid"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSeniority(input)).toBe(expected);
  });

  it("treats Product Manager as a role, not a seniority", () => {
    expect(normalizeSeniority("Product Manager", 4)).toBe("mid");
  });

  it("falls back to total years when the title says nothing", () => {
    expect(normalizeSeniority("Software Engineer", 1)).toBe("junior");
    expect(normalizeSeniority("Software Engineer", 3)).toBe("mid");
    expect(normalizeSeniority("Software Engineer", 8)).toBe("senior");
    expect(normalizeSeniority("Software Engineer")).toBe("mid");
  });
});

describe("normalizeSkills", () => {
  it("merges aliases, keeping the most years and first-seen order", () => {
    expect(
      normalizeSkills([
        { name: "ReactJS", years: 2 },
        { name: "TypeScript" },
        { name: "React", years: 5 },
        { name: "ts", years: 3 },
      ]),
    ).toEqual([
      { name: "React", years: 5 },
      { name: "TypeScript", years: 3 },
    ]);
  });

  it("leaves years absent when no duplicate states them", () => {
    expect(normalizeSkills([{ name: "k8s" }])).toEqual([{ name: "Kubernetes" }]);
  });
});

describe("normalizeLanguages", () => {
  it("merges aliases, keeping the highest level", () => {
    expect(
      normalizeLanguages([
        { language: "Deutsch", level: "B1" },
        { language: "German", level: "C1" },
        { language: "English", level: "native" },
        { language: "en", level: "C2" },
      ]),
    ).toEqual([
      { language: "German", level: "C1" },
      { language: "English", level: "native" },
    ]);
  });
});

describe("normalizeProfile", () => {
  const profile: CandidateProfile = {
    name: "Lena Novak",
    headline: "Senior Front-end Developer",
    role: "other",
    seniority: "senior",
    location: "Berlin, Germany",
    remote: ["hybrid", "relocation"],
    workAuthorization: "EU citizen",
    availability: 30,
    yearsTotal: 7,
    skills: [
      { name: "reactjs", years: 5 },
      { name: "React", years: 6 },
    ],
    languages: [{ language: "deutsch", level: "native" }],
    education: [{ degree: "bachelor", field: "Computer Science", institution: "TU Berlin", year: 2016 }],
    employment: [
      { company: "Acme", title: "Senior Frontend Developer", industry: "Retail", from: "2021-03", to: null },
    ],
    leadership: { has: false, note: "" },
    certifications: [" AWS Certified Developer ", "AWS Certified Developer"],
  };

  it("normalises skills, languages and certifications, and fills an unknown role from the headline", () => {
    const result = normalizeProfile(profile);
    expect(result.role).toBe("frontend");
    expect(result.skills).toEqual([{ name: "React", years: 6 }]);
    expect(result.languages).toEqual([{ language: "German", level: "native" }]);
    expect(result.certifications).toEqual(["AWS Certified Developer"]);
  });

  it("keeps a role the extractor already set", () => {
    expect(normalizeProfile({ ...profile, role: "fullstack" }).role).toBe("fullstack");
  });

  it("does not mutate its input", () => {
    const copy = structuredClone(profile);
    normalizeProfile(profile);
    expect(profile).toEqual(copy);
  });
});
