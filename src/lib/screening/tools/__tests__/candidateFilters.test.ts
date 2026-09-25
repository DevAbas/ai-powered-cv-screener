import { describe, expect, it } from "vitest";
import type { Filters } from "@/contracts";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "@/mocks/sampleIndex";
import { applyFilters, inRange, matchEntry } from "../candidateFilters";

const ids = (filters: Filters, scope?: string[]) => applyFilters(TEST_INDEX, filters, scope ? new Set(scope) : undefined).map((m) => m.entry.id);

describe("inRange", () => {
  it("applies each bound, and never matches an unknown value", () => {
    expect(inRange(5, { gte: 5 })).toBe(true);
    expect(inRange(4.9, { gte: 5 })).toBe(false);
    expect(inRange(2, { lt: 2 })).toBe(false);
    expect(inRange(1.5, { lt: 2 })).toBe(true);
    expect(inRange(10, { gt: 10 })).toBe(false);
    expect(inRange(2, { lte: 2 })).toBe(true);
    expect(inRange(undefined, { gte: 0 })).toBe(false);
    expect(inRange(null, undefined)).toBe(true);
  });
});

describe("applyFilters", () => {
  it("lists everyone by name with no filters", () => {
    expect(ids({})).toEqual(["andrei-popescu", "elena-georgiou", "lena-novak"]);
  });

  it("matches skills with all (default) or any, and years ranges, ordering by the first skill's years", () => {
    expect(ids({ skills: [{ skill: "Python" }] })).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(ids({ skills: [{ skill: "Python" }, { skill: "Java" }] })).toEqual(["elena-georgiou"]);
    expect(ids({ skills: [{ skill: "Go" }, { skill: "Java" }], skillsMatch: "any" })).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(ids({ skills: [{ skill: "Python", years: { gte: 5 } }] })).toEqual(["andrei-popescu"]);
    expect(ids({ skills: [{ skill: "React", years: { lt: 2 } }] })).toEqual([]);
  });

  it("orders languages by level with native above C2 and matches any level when none is given", () => {
    expect(ids({ languages: [{ language: "English" }] })).toHaveLength(3);
    expect(ids({ languages: [{ language: "English", minLevel: "C1" }] })).toEqual(["andrei-popescu", "lena-novak"]);
    expect(ids({ languages: [{ language: "German", minLevel: "C2" }] })).toEqual(["lena-novak"]);
    expect(ids({ languages: [{ language: "Greek", minLevel: "native" }] })).toEqual(["elena-georgiou"]);
  });

  it("filters by role, seniority scale, location, work mode, authorization, notice and years", () => {
    expect(ids({ roles: ["backend"] })).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(ids({ minSeniority: "senior" })).toEqual(["andrei-popescu", "lena-novak"]);
    expect(ids({ maxSeniority: "mid" })).toEqual(["elena-georgiou"]);
    expect(ids({ seniorities: ["mid", "senior"], roles: ["frontend"] })).toEqual(["lena-novak"]);
    expect(ids({ countries: ["Germany", "Greece"] })).toEqual(["elena-georgiou", "lena-novak"]);
    expect(ids({ cities: ["Athens"] })).toEqual(["elena-georgiou"]);
    expect(ids({ workModes: ["onsite"] })).toEqual(["andrei-popescu"]);
    expect(ids({ workAuthorizations: ["EU Citizen"] })).toHaveLength(3);
    expect(ids({ availabilityDays: { lte: 14 } })).toEqual(["elena-georgiou"]);
    expect(ids({ yearsTotal: { gt: 5 } })).toEqual(["andrei-popescu", "lena-novak"]);
  });

  it("matches education and employment per entry, certifications, leadership and job stability", () => {
    expect(ids({ institutions: ["TU Berlin"] })).toEqual(["lena-novak"]);
    expect(ids({ degrees: ["master"] })).toEqual(["andrei-popescu"]);
    expect(ids({ degrees: ["bachelor"], fields: ["Informatics"] })).toEqual(["elena-georgiou"]);
    expect(ids({ graduationYear: { gte: 2018 } })).toEqual(["elena-georgiou", "lena-novak"]);
    expect(ids({ companies: ["Aegean Pay"] })).toEqual(["elena-georgiou"]);
    expect(ids({ industries: ["Cloud Software", "E-commerce"] })).toEqual(["andrei-popescu", "lena-novak"]);
    expect(ids({ certifications: ["AWS Certified Developer - Associate"] })).toEqual(["lena-novak"]);
    expect(ids({ leadership: true })).toEqual(["lena-novak"]);
    expect(ids({ leadership: false })).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(ids({ medianTenureMonths: { gte: 60 } })).toEqual(["andrei-popescu", "elena-georgiou"]);
  });

  it("narrows to the scope of a follow-up", () => {
    expect(ids({ skills: [{ skill: "Python" }] }, ["elena-georgiou", "lena-novak"])).toEqual(["elena-georgiou"]);
    expect(ids({ languages: [{ language: "Japanese" }] }, ["elena-georgiou"])).toEqual([]);
  });

  it("cites the value and page that satisfied each criterion", () => {
    expect(matchEntry(LENA, { skills: [{ skill: "React", years: { gte: 5 } }], languages: [{ language: "German" }] })).toEqual([
      { field: "skill", value: "React (7 years)", page: 1, section: "skills" },
      { field: "language", value: "German (native)", page: 2, section: "languages" },
    ]);
    expect(matchEntry(ELENA, { availabilityDays: { lte: 0 } })?.[0]?.value).toBe("available immediately");
    expect(matchEntry(ANDREI, { skills: [{ skill: "React" }] })).toBeUndefined();
  });
});
