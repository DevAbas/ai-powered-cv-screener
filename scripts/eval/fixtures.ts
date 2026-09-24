import type { CandidateSeed } from "@/contracts/candidate";
import type { Seeds } from "./types";

// Small seeds for the rule and scorer tests, independent of the pilot pool.

export function seed(overrides: Partial<CandidateSeed> & Pick<CandidateSeed, "name">): CandidateSeed {
  return {
    headline: "Engineer",
    role: "backend",
    seniority: "mid",
    location: "Athens, Greece",
    remote: ["remote"],
    workAuthorization: "EU Citizen",
    availability: 30,
    yearsTotal: 4,
    skills: [{ name: "Python", years: 3 }],
    languages: [
      { language: "Greek", level: "native" },
      { language: "English", level: "B2" },
    ],
    education: [{ degree: "bachelor", field: "Informatics", institution: "University of Athens", year: 2020 }],
    employment: [
      {
        company: "Aegean Pay",
        title: "Backend Engineer",
        industry: "Financial Technology",
        from: "2021-06",
        to: null,
        description: "Payments.",
        stack: ["Python"],
        highlights: ["Built services in Python.", "Kept them running."],
      },
    ],
    leadership: { has: false, note: "" },
    certifications: [],
    skillGroups: [
      { label: "Languages", skills: ["Python"] },
      { label: "Other", skills: [] },
    ],
    summary: "An engineer.",
    contact: { email: "x.y@example.com", phone: "+1-555-000-0000" },
    photoPrompt: "A person.",
    template: 0,
    ...overrides,
  };
}

export const LENA = seed({
  name: "Lena Novak",
  headline: "Senior Frontend Engineer",
  role: "frontend",
  seniority: "senior",
  location: "Berlin, Germany",
  yearsTotal: 7,
  skills: [
    { name: "React", years: 7 },
    { name: "TypeScript", years: 6 },
  ],
  languages: [
    { language: "German", level: "native" },
    { language: "English", level: "C1" },
  ],
  employment: [
    {
      company: "Kinetix Digital",
      title: "Senior Frontend Engineer",
      industry: "E-commerce",
      from: "2022-03",
      to: null,
      description: "Shops.",
      stack: ["React"],
      highlights: ["Led the frontend.", "Mentored juniors."],
    },
    {
      company: "Old Shop",
      title: "Frontend Engineer",
      industry: "E-commerce",
      from: "2018-01",
      to: "2022-02",
      description: "Shops.",
      stack: ["React"],
      highlights: ["Built the shop.", "Kept it fast."],
    },
  ],
  leadership: { has: true, note: "Mentored junior developers" },
  certifications: ["AWS Certified Developer - Associate"],
});

export const ANDREI = seed({
  name: "Andrei Popescu",
  headline: "Senior Backend Engineer",
  role: "backend",
  seniority: "senior",
  location: "Bucharest, Romania",
  yearsTotal: 9,
  skills: [
    { name: "Python", years: 8 },
    { name: "Go", years: 4 },
  ],
  languages: [
    { language: "Romanian", level: "native" },
    { language: "English", level: "C1" },
  ],
});

export const ELENA = seed({ name: "Elena Georgiou" });

export const TEST_SEEDS: Seeds = new Map([
  ["andrei-popescu", ANDREI],
  ["elena-georgiou", ELENA],
  ["lena-novak", LENA],
]);
