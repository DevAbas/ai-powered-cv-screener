import { describe, expect, it } from "vitest";
import { CandidateSeedSchema } from "@/contracts/candidate";
import { ROSTER } from "./roster";
import type { GeneratedSeed } from "./seed";
import {
  assembleSeed,
  contactFor,
  findDuplicateEmployment,
  generatedSeedSchemaFor,
  isWinAnsi,
  nonWinAnsiStrings,
  seedPrompt,
  slugOf,
  templateFor,
  tenureMonths,
} from "./seed";

/** A valid seed for a senior (5–10 years). */
const generated: GeneratedSeed = {
  remote: ["hybrid", "remote"],
  workAuthorization: "EU citizen",
  availability: 30,
  yearsTotal: 7,
  skills: [
    { name: "ReactJS", years: 6 },
    { name: "TypeScript", years: 5 },
    { name: "Next.js", years: 3 },
    { name: "Node.js", years: 4 },
    { name: "GraphQL" },
    { name: "Jest", years: 4 },
  ],
  languages: [
    { language: "German", level: "native" },
    { language: "English", level: "C1" },
  ],
  education: [{ degree: "bachelor", field: "Computer Science", institution: "Technical University of Berlin", year: 2019 }],
  employment: [
    {
      company: "Nordwind Labs",
      title: "Senior Frontend Engineer",
      industry: "E-commerce",
      from: "2022-03",
      to: null,
      description: "Online marketplace for outdoor equipment.",
      stack: ["React", "TypeScript", "Next.js", "Jest"],
      highlights: ["Led the migration to Next.js", "Built the design system in React and TypeScript"],
    },
    {
      company: "Brightline Software",
      title: "Frontend Engineer",
      industry: "SaaS",
      from: "2019-07",
      to: "2022-02",
      description: "Customer portal for a B2B invoicing product.",
      stack: ["ReactJS", "Node.js", "GraphQL"],
      highlights: ["Shipped the React customer portal", "Introduced Jest test coverage"],
    },
  ],
  skillGroups: [
    { label: "Languages", skills: ["TypeScript"] },
    { label: "Frameworks and Libraries", skills: ["ReactJS", "Next.js", "Node.js", "GraphQL"] },
    { label: "Testing", skills: ["Jest"] },
  ],
  leadership: { has: false, note: "" },
  certifications: [],
  summary: "Senior frontend engineer with 7 years of experience in React and TypeScript.",
  photoPrompt: "A woman in her early thirties with shoulder-length brown hair and a calm smile, wearing a navy blouse.",
};

const senior = generatedSeedSchemaFor("senior");
const failing = (seed: GeneratedSeed) => {
  const result = senior.safeParse(seed);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
};

describe("slugOf", () => {
  it("lowercases and strips diacritics", () => {
    expect(slugOf("Inés García")).toBe("ines-garcia");
    expect(slugOf("Daan de Vries")).toBe("daan-de-vries");
    expect(slugOf("Zuzana Holubová")).toBe("zuzana-holubova");
  });
});

describe("contactFor", () => {
  it("matches the contract's reserved formats", () => {
    const contact = contactFor("Inés García", 15);
    expect(contact).toEqual({ email: "ines.garcia@example.com", phone: "+1-555-016-1616" });
    expect(CandidateSeedSchema.shape.contact.safeParse(contact).success).toBe(true);
  });
});

describe("templateFor", () => {
  it("cycles through the three templates", () => {
    expect([0, 1, 2, 3, 4].map(templateFor)).toEqual([0, 1, 2, 0, 1]);
  });
});

describe("isWinAnsi", () => {
  it("accepts Western European accents and rejects other letters", () => {
    expect(isWinAnsi("Chloé Dubois, Zürich – “quotes” € ß")).toBe(true);
    expect(isWinAnsi("Łódź")).toBe(false);
    expect(isWinAnsi("Kovač")).toBe(false);
    expect(nonWinAnsiStrings({ a: ["ok", "Szabó", "Ödön"], b: { c: "Győr" } })).toEqual(["Győr"]);
  });
});

describe("tenureMonths", () => {
  it("counts months, with null meaning now", () => {
    expect(tenureMonths("2019-07", "2022-02")).toBe(31);
    expect(tenureMonths("2022-03", null)).toBe(54);
  });
});

describe("generatedSeedSchemaFor", () => {
  it("accepts a consistent seed", () => {
    expect(senior.safeParse(generated).success).toBe(true);
  });

  it("checks yearsTotal against the seniority band", () => {
    expect(failing({ ...generated, yearsTotal: 12 })).toContain("yearsTotal");
    expect(generatedSeedSchemaFor("junior").safeParse({ ...generated, yearsTotal: 7 }).success).toBe(false);
  });

  it("requires the current job to be open unless available now", () => {
    const [current, previous] = generated.employment;
    expect(failing({ ...generated, employment: [{ ...current, to: "2026-01" }, previous] })).toContain("employment.0.to");
    expect(senior.safeParse({ ...generated, availability: 0, employment: [{ ...current, to: "2026-01" }, previous] }).success).toBe(true);
  });

  it("requires descending dates within the reference month", () => {
    const [current, previous] = generated.employment;
    expect(failing({ ...generated, employment: [{ ...current, from: "2019-01" }, previous] })).toContain("employment.1.from");
    expect(failing({ ...generated, employment: [{ ...current, from: "2027-01" }, previous] })).toContain("employment.0.from");
    expect(failing({ ...generated, employment: [current, { ...previous, to: null }] })).toContain("employment.1.to");
  });

  it("keeps tenures near yearsTotal", () => {
    expect(failing({ ...generated, yearsTotal: 10 })).toContain("yearsTotal");
  });

  it("bounds skill years and education", () => {
    expect(failing({ ...generated, skills: [...generated.skills, { name: "Go", years: 9 }] })).toContain("skills.6.years");
    expect(failing({ ...generated, education: [{ ...generated.education[0], year: 2024 }] })).toContain("education");
  });

  it("requires leadership for lead and principal", () => {
    const lead = generatedSeedSchemaFor("lead");
    expect(lead.safeParse({ ...generated, yearsTotal: 9, skills: generated.skills }).success).toBe(false);
  });

  it("keeps stacks and skill groups within the skills", () => {
    const [current, previous] = generated.employment;
    expect(failing({ ...generated, employment: [{ ...current, stack: ["Rust"] }, previous] })).toContain("employment.0.stack.0");
    expect(failing({ ...generated, skillGroups: [{ label: "Languages", skills: ["TypeScript"] }, { label: "Other", skills: ["Jest"] }] })).toContain("skillGroups");
    expect(failing({ ...generated, skillGroups: [...generated.skillGroups, { label: "More", skills: ["Jest"] }] })).toContain("skillGroups");
  });

  it("requires exactly one native language and printable text", () => {
    expect(failing({ ...generated, languages: [{ language: "English", level: "C1" }] })).toContain("languages");
    expect(failing({ ...generated, summary: "Works in Łódź." })).toContain("");
  });
});

describe("assembleSeed", () => {
  it("adds the fixed and derived fields and normalises the profile", () => {
    const seed = assembleSeed(ROSTER[0], 0, generated);
    expect(seed.name).toBe("Lena Novak");
    expect(seed.role).toBe("frontend");
    expect(seed.template).toBe(0);
    expect(seed.contact.email).toBe("lena.novak@example.com");
    expect(seed.skills[0]).toEqual({ name: "React", years: 6 });
    expect(seed.employment[1].stack[0]).toBe("React");
    expect(seed.skillGroups[1].skills[0]).toBe("React");
    expect(seed.employment[0].highlights).toHaveLength(2);
    expect(CandidateSeedSchema.safeParse(seed).success).toBe(true);
  });
});

describe("seedPrompt", () => {
  it("carries the fixed fields, the rules and the used companies", () => {
    const { instructions, prompt } = seedPrompt(ROSTER[1], ["Nordwind Labs"]);
    expect(instructions).toContain("between 8 and 15 (lead)");
    expect(instructions).toContain("leadership.has is true");
    expect(prompt).toContain('"name": "Jane Doe"');
    expect(prompt).toContain("Nordwind Labs");
  });
});

describe("findDuplicateEmployment", () => {
  it("groups seeds with the same employers and titles", () => {
    const other = { employment: [...generated.employment].reverse() };
    const different = { employment: [{ ...generated.employment[0], company: "Other Co" }] };
    expect(findDuplicateEmployment([generated, other, different], ["a", "b", "c"])).toEqual([["a", "b"]]);
  });
});
