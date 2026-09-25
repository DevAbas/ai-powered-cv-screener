import { describe, expect, it } from "vitest";
import { describeFilters, join, leadSentence, rangeWords, searchLead } from "./describe";

describe("describeFilters", () => {
  it("puts skills, years, languages, roles and places into phrases after 'candidates'", () => {
    expect(describeFilters({ skills: [{ skill: "React" }] })).toEqual(["with React experience"]);
    expect(describeFilters({ skills: [{ skill: "React" }, { skill: "TypeScript" }] })).toEqual(["with React and TypeScript experience"]);
    expect(describeFilters({ skills: [{ skill: "Kotlin" }, { skill: "Swift" }], skillsMatch: "any" })).toEqual(["with Kotlin or Swift experience"]);
    expect(describeFilters({ skills: [{ skill: "React", years: { gte: 5 } }] })).toEqual(["with 5+ years of React experience"]);
    expect(describeFilters({ languages: [{ language: "German" }] })).toEqual(["who speak German"]);
    expect(describeFilters({ languages: [{ language: "English", minLevel: "C2" }] })).toEqual(["who speak English at C2 or above"]);
    expect(describeFilters({ roles: ["qa"] })).toEqual(["in QA roles"]);
    expect(describeFilters({ languages: [{ language: "German" }], roles: ["qa"] }, true)).toEqual(["who speaks German", "in a QA role"]);
    expect(describeFilters({ minSeniority: "lead" })).toEqual(["at lead level or above"]);
    expect(describeFilters({ countries: ["Denmark", "Romania"], roles: ["backend"], seniorities: ["senior"] })).toEqual(["in backend roles", "at senior level", "based in Denmark or Romania"]);
  });

  it("words the other criteria", () => {
    expect(describeFilters({ yearsTotal: { lt: 2 } })).toEqual(["with under 2 years of experience"]);
    expect(describeFilters({ yearsTotal: { gt: 10 } })).toEqual(["with more than 10 years of experience"]);
    expect(describeFilters({ availabilityDays: { lte: 14 } })).toEqual(["available within 14 days"]);
    expect(describeFilters({ availabilityDays: { lte: 0 } })).toEqual(["available immediately"]);
    expect(describeFilters({ workModes: ["relocation"] })).toEqual(["open to relocation"]);
    expect(describeFilters({ workModes: ["onsite", "hybrid"] })).toEqual(["open to on-site or hybrid work"]);
    expect(describeFilters({ degrees: ["master"] })).toEqual(["with a master's degree"]);
    expect(describeFilters({ institutions: ["Trinity College Dublin"] })).toEqual(["who studied at Trinity College Dublin"]);
    expect(describeFilters({ graduationYear: { gte: 2018 } })).toEqual(["who graduated in 2018 or later"]);
    expect(describeFilters({ companies: ["Kinetix Digital"] })).toEqual(["who worked at Kinetix Digital"]);
    expect(describeFilters({ industries: ["FinTech", "Financial Technology"] })).toEqual(["who worked in FinTech or Financial Technology"]);
    expect(describeFilters({ certifications: ["AWS Certified Developer"] })).toEqual(["with the AWS Certified Developer certification"]);
    expect(describeFilters({ leadership: true })).toEqual(["with leadership experience"]);
    expect(describeFilters({ medianTenureMonths: { gte: 36 } })).toEqual(["with a median job length of 36+ months"]);
    expect(describeFilters({})).toEqual([]);
  });
});

describe("leadSentence", () => {
  const react = { skills: [{ skill: "React" }] };

  it("opens a filter, a single match, a count, a list of everyone and a no match", () => {
    expect(leadSentence({ filters: react, matched: 7, total: 30, scope: "whole_pool", rowsShown: true, counted: false })).toBe("There are 7 candidates with React experience. Here are their details.");
    expect(leadSentence({ filters: react, matched: 1, total: 30, scope: "whole_pool", rowsShown: true, counted: false })).toBe("There is 1 candidate with React experience. Here is their CV.");
    expect(leadSentence({ filters: { languages: [{ language: "German" }], roles: ["qa"] }, matched: 1, total: 30, scope: "whole_pool", rowsShown: true, counted: false })).toBe("There is 1 candidate who speaks German in a QA role. Here is their CV.");
    expect(leadSentence({ filters: { skills: [{ skill: "Python" }] }, matched: 19, total: 30, scope: "whole_pool", rowsShown: false, counted: true })).toBe("Out of 30 candidates, there are 19 with Python experience.");
    expect(leadSentence({ filters: {}, matched: 30, total: 30, scope: "whole_pool", rowsShown: true, counted: false })).toBe("There are 30 candidates in the pool. Here are all of them.");
    expect(leadSentence({ filters: { skills: [{ skill: "Rust" }] }, matched: 0, total: 30, scope: "whole_pool", rowsShown: false, counted: false })).toBe("There are no candidates with Rust experience.");
  });

  it("opens a follow-up on the previous answer", () => {
    expect(leadSentence({ filters: { languages: [{ language: "German" }] }, matched: 2, total: 7, scope: "previous_answer", rowsShown: true, counted: false })).toBe("Of the previous 7 candidates, there are 2 who speak German. Here are their details.");
    expect(leadSentence({ filters: { languages: [{ language: "Japanese" }] }, matched: 0, total: 7, scope: "previous_answer", rowsShown: false, counted: false })).toBe("Of the previous 7 candidates, there are none who speak Japanese.");
  });

  it("opens a text search and words ranges and joins", () => {
    expect(searchLead(3, true)).toBe("3 CVs match what you asked. Here are the candidates.");
    expect(searchLead(0, false)).toBe("No CV matches what you asked.");
    expect(rangeWords({ gte: 2, lte: 5 }, "years")).toBe("2 to 5 years");
    expect(join(["a", "b", "c"], "and")).toBe("a, b and c");
  });
});
