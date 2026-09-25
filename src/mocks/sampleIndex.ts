import type { CandidateProfile, IndexEntry } from "@/contracts";
import { buildIndexEntry } from "@/lib/candidates";

// A small index for retrieval and answering tests. Not the pilot pool:
// tests must not change when the pool is regenerated.

const NOW = new Date(Date.UTC(2026, 8, 24));

function entry(id: string, text: string[], profile: CandidateProfile): IndexEntry {
  return buildIndexEntry(id, text, profile, {}, NOW).entry;
}

export const LENA = entry(
  "lena-novak",
  [
    "Lena Novak\nSenior Frontend Engineer\nBerlin, Germany\nHybrid · Remote · EU Citizen · Notice period: 30 days\nSUMMARY\nSeven years of frontend work.\nSKILLS\nReact (7 years) · TypeScript (6 years) · HTML/CSS (7 years)",
    "EXPERIENCE\nSenior Frontend Engineer — Kinetix Digital Mar 2022 – Present\nIndustry: E-commerce\nEDUCATION\nBSc Computer Science 2018\nTU Berlin\nLANGUAGES\nGerman (native) · English (C1)\nLEADERSHIP\nMentored junior developers\nCERTIFICATIONS\nAWS Certified Developer - Associate",
  ],
  {
    name: "Lena Novak",
    headline: "Senior Frontend Engineer",
    role: "frontend",
    seniority: "senior",
    location: "Berlin, Germany",
    remote: ["hybrid", "remote"],
    workAuthorization: "EU Citizen",
    availability: 30,
    yearsTotal: 7,
    skills: [
      { name: "React", years: 7 },
      { name: "TypeScript", years: 6 },
      { name: "HTML/CSS", years: 7 },
    ],
    languages: [
      { language: "German", level: "native" },
      { language: "English", level: "C1" },
    ],
    education: [{ degree: "bachelor", field: "Computer Science", institution: "TU Berlin", year: 2018 }],
    employment: [{ company: "Kinetix Digital", title: "Senior Frontend Engineer", industry: "E-commerce", from: "2022-03", to: null }],
    leadership: { has: true, note: "Mentored junior developers" },
    certifications: ["AWS Certified Developer - Associate"],
  },
);

export const ANDREI = entry(
  "andrei-popescu",
  [
    "Andrei Popescu\nSenior Backend Engineer\nBucharest, Romania\nOn-site · Hybrid · EU Citizen · Notice period: 60 days\nSKILLS\nPython (8 years) · Go (4 years) · PostgreSQL (6 years)\nEXPERIENCE\nSenior Backend Engineer — Carpathia Cloud Jan 2019 – Present\nIndustry: Cloud Software\nEDUCATION\nMSc Computer Science 2016\nUniversity of Bucharest\nLANGUAGES\nRomanian (native) · English (C1)",
  ],
  {
    name: "Andrei Popescu",
    headline: "Senior Backend Engineer",
    role: "backend",
    seniority: "senior",
    location: "Bucharest, Romania",
    remote: ["onsite", "hybrid"],
    workAuthorization: "EU Citizen",
    availability: 60,
    yearsTotal: 9,
    skills: [
      { name: "Python", years: 8 },
      { name: "Go", years: 4 },
      { name: "PostgreSQL", years: 6 },
    ],
    languages: [
      { language: "Romanian", level: "native" },
      { language: "English", level: "C1" },
    ],
    education: [{ degree: "master", field: "Computer Science", institution: "University of Bucharest", year: 2016 }],
    employment: [{ company: "Carpathia Cloud", title: "Senior Backend Engineer", industry: "Cloud Software", from: "2019-01", to: null }],
    leadership: { has: false, note: "" },
    certifications: [],
  },
);

export const ELENA = entry(
  "elena-georgiou",
  [
    "Elena Georgiou\nBackend Engineer\nAthens, Greece\nRemote · EU Citizen · Available immediately\nSKILLS\nJava (5 years) · Python (3 years)\nEXPERIENCE\nBackend Engineer — Aegean Pay Jun 2021 – Present\nIndustry: Financial Technology\nEDUCATION\nBSc Informatics 2020\nUniversity of Athens\nLANGUAGES\nGreek (native) · English (B2)",
  ],
  {
    name: "Elena Georgiou",
    headline: "Backend Engineer",
    role: "backend",
    seniority: "mid",
    location: "Athens, Greece",
    remote: ["remote"],
    workAuthorization: "EU Citizen",
    availability: 0,
    yearsTotal: 5,
    skills: [
      { name: "Java", years: 5 },
      { name: "Python", years: 3 },
    ],
    languages: [
      { language: "Greek", level: "native" },
      { language: "English", level: "B2" },
    ],
    education: [{ degree: "bachelor", field: "Informatics", institution: "University of Athens", year: 2020 }],
    employment: [{ company: "Aegean Pay", title: "Backend Engineer", industry: "Financial Technology", from: "2021-06", to: null }],
    leadership: { has: false, note: "" },
    certifications: [],
  },
);

export const TEST_INDEX: readonly IndexEntry[] = [ANDREI, ELENA, LENA];
