import { describe, expect, it } from "vitest";
import type { CandidateProfile, Employment } from "@/contracts/candidate";
import { checkAgainstText, dropUnstatedYears, extractPrompt, restoreCase } from "./extract";
import { cleanPageText, joinSpacedCapitals } from "./pdf-text";
import { medianTenureMonths, yearMonthOf } from "./tenure";

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
    expect(joinSpacedCapitals("BSc Computer Science 2018")).toBe("BSc Computer Science 2018");
  });
});

describe("cleanPageText", () => {
  it("trims lines, drops blank ones and rejoins headings", () => {
    expect(cleanPageText("Lena Novak \n\n S K I L L S\nReact · TypeScript\n")).toBe("Lena Novak\nSKILLS\nReact · TypeScript");
  });
});

describe("extractPrompt", () => {
  it("marks every page", () => {
    expect(extractPrompt(["one", "two"])).toBe("--- Page 1 ---\none\n\n--- Page 2 ---\ntwo");
  });
});

describe("dropUnstatedYears", () => {
  it("drops zero years and keeps stated ones", () => {
    const profile = { skills: [{ name: "React", years: 0 }, { name: "Jest", years: 4 }, { name: "Redux" }] };
    expect(dropUnstatedYears(profile as Parameters<typeof dropUnstatedYears>[0]).skills).toEqual([
      { name: "React" },
      { name: "Jest", years: 4 },
      { name: "Redux" },
    ]);
  });
});

describe("restoreCase", () => {
  const text = "Senior Frontend Developer — Tagus Vista Solutions\nHTML/CSS · Next.js";
  it("takes the CV's capitalisation", () => {
    expect(restoreCase("tagus vista solutions", text)).toBe("Tagus Vista Solutions");
    expect(restoreCase("html/css", text)).toBe("HTML/CSS");
    expect(restoreCase("next.js", text)).toBe("Next.js");
  });

  it("prefers a capitalised match over prose and matches across line breaks", () => {
    const cv = "mentoring junior frontend developers\nJunior Frontend Developer — Atlantico\nFinancial\nTechnology";
    expect(restoreCase("junior frontend developer", cv)).toBe("Junior Frontend Developer");
    expect(restoreCase("financial technology", cv)).toBe("Financial Technology");
  });

  it("keeps a value the text does not contain", () => {
    expect(restoreCase("Financial Technology", text)).toBe("Financial Technology");
  });
});

describe("checkAgainstText", () => {
  const profile: CandidateProfile = {
    name: "sofia almeida",
    headline: "senior frontend developer",
    role: "security",
    seniority: "senior",
    location: "lisbon, portugal",
    remote: ["hybrid"],
    workAuthorization: "eu citizen",
    availability: 30,
    yearsTotal: 7,
    skills: [{ name: "react" }],
    languages: [],
    education: [{ degree: "bachelor", field: "computer science", institution: "university of lisbon", year: 2018 }],
    employment: [{ company: "tagus vista", title: "senior frontend developer", industry: "fintech", from: "2022-03", to: null }],
    leadership: { has: false, note: "" },
    certifications: ["aws certified cloud practitioner"],
  };
  const text = [
    "Sofia Almeida",
    "Senior Frontend Developer",
    "Lisbon, Portugal · EU Citizen",
    "React",
    "Senior Frontend Developer — Tagus Vista",
    "BSc Computer Science 2018",
    "University of Lisbon",
    "AWS Certified Cloud Practitioner",
  ].join("\n");

  it("restores capitalisation and takes the role from the headline", () => {
    const checked = checkAgainstText(profile, text);
    expect(checked.name).toBe("Sofia Almeida");
    expect(checked.role).toBe("frontend");
    expect(checked.workAuthorization).toBe("EU Citizen");
    expect(checked.employment[0].company).toBe("Tagus Vista");
    expect(checked.employment[0].industry).toBe("fintech");
    expect(checked.education[0].institution).toBe("University of Lisbon");
    expect(checked.certifications).toEqual(["AWS Certified Cloud Practitioner"]);
  });

  it("keeps the model's role when the headline names none", () => {
    expect(checkAgainstText({ ...profile, headline: "Head of Product", role: "product" }, "Head of Product").role).toBe("product");
  });
});

const job = (from: string, to: string | null): Employment => ({ company: "Acme", title: "Engineer", industry: "Retail", from, to });

describe("medianTenureMonths", () => {
  it("counts both end months and runs a current job to now", () => {
    expect(medianTenureMonths([job("2024-01", "2024-12")], "2026-09")).toBe(12);
    expect(medianTenureMonths([job("2026-01", null)], "2026-09")).toBe(9);
  });

  it("takes the median, averaging the middle two", () => {
    expect(medianTenureMonths([job("2020-01", "2020-06"), job("2021-01", "2021-12"), job("2022-01", "2023-12")], "2026-09")).toBe(12);
    expect(medianTenureMonths([job("2020-01", "2020-06"), job("2021-01", "2021-12")], "2026-09")).toBe(9);
  });

  it("is null without jobs", () => {
    expect(medianTenureMonths([], "2026-09")).toBeNull();
  });
});

describe("yearMonthOf", () => {
  it("formats a date as YYYY-MM in UTC", () => {
    expect(yearMonthOf(new Date(Date.UTC(2026, 8, 24)))).toBe("2026-09");
  });
});
