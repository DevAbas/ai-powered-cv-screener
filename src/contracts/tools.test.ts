import { describe, expect, it } from "vitest";
import type { Vocabulary } from "./tools";
import { filtersSchema, findCandidatesInput, getCandidatesInput, presentInput, searchCvTextInput, STATIC_VOCABULARY } from "./tools";

const vocab: Vocabulary = {
  ...STATIC_VOCABULARY,
  candidateIds: ["lena-novak", "andrei-popescu"],
  skills: ["React", "Python"],
  languages: ["German", "English"],
  cities: ["Berlin"],
  countries: ["Germany"],
  institutions: ["TU Berlin"],
  fields: ["Computer Science"],
  companies: ["Kinetix Digital"],
  industries: ["E-commerce"],
  certifications: [],
  workAuthorizations: ["EU Citizen"],
};

describe("filtersSchema", () => {
  it("accepts the pool's values and ranges", () => {
    const filters = filtersSchema(vocab).parse({
      roles: ["frontend"],
      minSeniority: "senior",
      skills: [{ skill: "React", years: { gte: 5 } }],
      languages: [{ language: "German" }],
      countries: ["Germany"],
      yearsTotal: { lt: 2 },
      leadership: true,
    });
    expect(filters.skills?.[0]).toEqual({ skill: "React", years: { gte: 5 } });
  });

  it("rejects a value the pool does not hold, naming the options", () => {
    const result = filtersSchema(vocab).safeParse({ skills: [{ skill: "Rust" }] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/React.*Python/);
    expect(filtersSchema(vocab).safeParse({ certifications: ["AWS"] }).success).toBe(false);
    expect(filtersSchema(vocab).safeParse({ roles: ["chef"] }).success).toBe(false);
  });
});

describe("tool inputs", () => {
  it("find and count take filters and a scope", () => {
    expect(findCandidatesInput(vocab).safeParse({ filters: {}, scope: "whole_pool" }).success).toBe(true);
    expect(findCandidatesInput(vocab).safeParse({ filters: {}, scope: "everything" }).success).toBe(false);
  });

  it("get takes one to five known ids", () => {
    expect(getCandidatesInput(vocab).safeParse({ ids: ["lena-novak"] }).success).toBe(true);
    expect(getCandidatesInput(vocab).safeParse({ ids: [] }).success).toBe(false);
    expect(getCandidatesInput(vocab).safeParse({ ids: ["nobody"] }).success).toBe(false);
  });

  it("search takes a query, optional filters, a scope and a limit up to 10", () => {
    expect(searchCvTextInput(vocab).safeParse({ query: "machine learning", scope: "whole_pool", limit: 10 }).success).toBe(true);
    expect(searchCvTextInput(vocab).safeParse({ query: "", scope: "whole_pool" }).success).toBe(false);
    expect(searchCvTextInput(vocab).safeParse({ query: "x", scope: "whole_pool", limit: 11 }).success).toBe(false);
  });

  it("present names a view, known candidates with pages, and at most three skills", () => {
    const schema = presentInput(vocab);
    expect(schema.safeParse({ view: "list", candidates: [{ id: "lena-novak", page: 1, reason: "" }], skills: ["React"] }).success).toBe(true);
    expect(schema.safeParse({ view: "no_match", candidates: [], skills: [] }).success).toBe(true);
    expect(schema.safeParse({ view: "table", candidates: [], skills: [] }).success).toBe(false);
    expect(schema.safeParse({ view: "list", candidates: [{ id: "ghost", page: 1, reason: "" }], skills: [] }).success).toBe(false);
    expect(schema.safeParse({ view: "list", candidates: [{ id: "lena-novak", page: 0, reason: "" }], skills: [] }).success).toBe(false);
    expect(schema.safeParse({ view: "list", candidates: [], skills: ["React", "Python", "React", "Python"] }).success).toBe(false);
  });
});
