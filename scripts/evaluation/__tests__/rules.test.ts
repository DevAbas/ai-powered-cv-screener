import { describe, expect, it } from "vitest";
import { ANDREI, LENA, TEST_SEEDS } from "../fixtures";
import { argmax, country, hasCertificationContaining, ids, intersection, languageLevel, levelRank, medianTenure, seniorityRank, skillYears, union } from "../rules";

describe("rules", () => {
  it("selects ids by a predicate, sorted", () => {
    expect(ids(TEST_SEEDS, (s) => s.seniority === "senior")).toEqual(["andrei-popescu", "lena-novak"]);
    expect(ids(TEST_SEEDS, () => false)).toEqual([]);
  });

  it("reads skills, languages, countries and certifications", () => {
    expect(skillYears(LENA, "React")).toBe(7);
    expect(skillYears(LENA, "Rust")).toBeUndefined();
    expect(languageLevel(ANDREI, "English")).toBe("C1");
    expect(country(LENA)).toBe("Germany");
    expect(hasCertificationContaining(LENA, "AWS")).toBe(true);
  });

  it("orders levels with native above C2 and seniorities from junior to principal", () => {
    expect(levelRank("native")).toBeGreaterThan(levelRank("C2"));
    expect(levelRank("B1")).toBeLessThan(levelRank("B2"));
    expect(seniorityRank("lead")).toBeGreaterThan(seniorityRank("senior"));
  });

  it("derives job stability as the index does, and picks the best", () => {
    // Andrei's one job runs 64 months; Lena's two jobs give a median of 52.5.
    expect(medianTenure(ANDREI)).toBeGreaterThan(medianTenure(LENA));
    // Elena ties with Andrei; the id breaks the tie.
    expect(argmax(TEST_SEEDS, medianTenure)).toBe("andrei-popescu");
  });

  it("intersects and unites id lists", () => {
    expect(intersection(["a", "b", "c"], ["c", "a"])).toEqual(["a", "c"]);
    expect(union(["b"], ["a", "b"])).toEqual(["a", "b"]);
  });
});
