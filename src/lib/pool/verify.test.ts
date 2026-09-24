import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "@/contracts/candidate";
import { splitSections } from "./sections";
import { locate, verifyProfile } from "./verify";

const PAGES = [
  [
    "Inés García",
    "Machine Learning Engineer",
    "ines.garcia@example.com · +1-555-016-1616 · Barcelona, Spain",
    "Hybrid · Remote · EU Citizen · Notice period: 30 days",
    "SUMMARY",
    "Inés García is a senior Machine Learning Engineer with 7 years of professional experience.",
    "SKILLS",
    "Python (7 years) · PyTorch (5 years) · HTML/CSS",
    "EXPERIENCE",
    "Senior Machine Learning Engineer — Catalunya Neural Corp Jun 2021 – Present",
    "Industry: Artificial Intelligence",
    "EDUCATION",
    "MSc Artificial Intelligence 2018",
    "Universitat Politècnica de Catalunya",
    "LANGUAGES",
    "Spanish (native) · English (C1)",
  ].join("\n"),
  ["LEADERSHIP", "Led junior engineers.", "CERTIFICATIONS", "AWS Certified Machine Learning"].join("\n"),
];

const profile: CandidateProfile = {
  name: "Inés García",
  headline: "machine learning engineer",
  role: "data",
  seniority: "senior",
  location: "Barcelona, Spain",
  remote: ["hybrid", "remote"],
  workAuthorization: "eu citizen",
  availability: 30,
  yearsTotal: 7,
  skills: [
    { name: "python", years: 7 },
    { name: "PyTorch", years: 0 },
    { name: "html/css" },
  ],
  languages: [
    { language: "Spanish", level: "native" },
    { language: "English", level: "C1" },
  ],
  education: [{ degree: "master", field: "artificial intelligence", institution: "universitat politecnica de catalunya", year: 2018 }],
  employment: [{ company: "Catalunya Neural Corp", title: "Senior Machine Learning Engineer", industry: "artificial intelligence", from: "2021-06", to: null }],
  leadership: { has: true, note: "Led junior engineers." },
  certifications: ["aws certified machine learning"],
};

describe("locate", () => {
  it("finds a value as a run of whole words, case, punctuation and spacing aside", () => {
    expect(locate("html css", "Skills: HTML/CSS · React")).toBe("HTML/CSS");
    expect(locate("onsite", "On-site · Remote")).toBe("On-site");
    expect(locate("politecnica", "Universitat Politècnica de Catalunya")).toBe("Politècnica");
    expect(locate("Szabó", "Nikolett Szabo")).toBe("Szabo");
  });

  it("never matches inside another word", () => {
    expect(locate("hey", "they said hey")).toBe("hey");
    expect(locate("all", "Valletta and Tallinn")).toBeUndefined();
    expect(locate("Go", "Google Cloud")).toBeUndefined();
  });
});

describe("verifyProfile", () => {
  const chunks = splitSections("ines-garcia", PAGES);
  const { profile: verified, sources, unverified } = verifyProfile(profile, chunks, {
    availabilityAsWritten: "Notice period: 30 days",
    yearsTotalAsWritten: "7 years of professional experience",
    skills: ["Python (7 years)", "PyTorch (5 years)", "HTML/CSS"],
    languages: ["Spanish (native)", "English (C1)"],
    education: ["MSc Artificial Intelligence 2018"],
    employment: ["Jun 2021 – Present"],
  });

  it("records the section and page of every field", () => {
    expect(sources.headline).toEqual({ section: "header", page: 1, verified: true });
    expect(sources.role).toEqual(sources.headline);
    expect(sources["skills.0"]).toEqual({ section: "skills", page: 1, verified: true });
    expect(sources["education.0"]).toEqual({ section: "education", page: 1, verified: true });
    expect(sources["employment.0"]).toEqual({ section: "experience", page: 1, verified: true });
    expect(sources.leadership).toEqual({ section: "leadership", page: 2, verified: true });
    expect(sources["certifications.0"]).toEqual({ section: "certifications", page: 2, verified: true });
    expect(sources.availability).toEqual({ section: "header", page: 1, verified: true });
    expect(sources.yearsTotal).toEqual({ section: "summary", page: 1, verified: true });
    expect(unverified).toEqual([]);
  });

  it("keeps the CV's spelling and drops years the CV does not state", () => {
    expect(verified.headline).toBe("Machine Learning Engineer");
    expect(verified.workAuthorization).toBe("EU Citizen");
    expect(verified.skills).toEqual([{ name: "Python", years: 7 }, { name: "PyTorch" }, { name: "HTML/CSS" }]);
    expect(verified.education[0].institution).toBe("Universitat Politècnica de Catalunya");
    expect(verified.education[0].field).toBe("Artificial Intelligence");
    expect(verified.employment[0].industry).toBe("Artificial Intelligence");
    expect(verified.certifications).toEqual(["AWS Certified Machine Learning"]);
  });

  it("reports a value the CV does not hold, a level or year the printed entry contradicts, and a leadership section that is missing or unexpected", () => {
    const wrong: CandidateProfile = {
      ...profile,
      skills: [{ name: "Rust" }],
      languages: [{ language: "English", level: "B2" }],
      education: [{ ...profile.education[0], year: 2019 }],
      leadership: { has: false, note: "" },
    };
    const result = verifyProfile(wrong, chunks, { languages: ["English (C1)"], education: ["MSc Artificial Intelligence 2018"] });
    expect(result.unverified).toEqual(["skills.0", "languages.0", "education.0", "leadership"]);
    expect(result.sources["skills.0"]).toEqual({ section: "skills", page: 1, verified: false });
    expect(verifyProfile({ ...profile, leadership: { has: false, note: "" } }, chunks.filter((c) => c.section !== "leadership")).sources.leadership.verified).toBe(true);
  });

  it("verifies what it can without evidence", () => {
    const result = verifyProfile(profile, chunks);
    expect(result.unverified).toEqual([]);
    expect(result.profile.skills[1]).toEqual({ name: "PyTorch", years: 0 });
  });
});
