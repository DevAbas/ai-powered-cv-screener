import { describe, expect, it } from "vitest";
import { readSeeds } from "../generate/seeds";
import { GOLDEN_QUESTIONS, goldenQuestion } from "./questions";
import type { Seeds } from "./types";

// The golden questions against the committed pool: every rule yields what the
// seeds say, so a regenerated pool shows up here before any model runs.

const seeds: Seeds = await readSeeds();

describe("golden questions", () => {
  it("have unique ids and follow up on questions that exist", () => {
    const ids = GOLDEN_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of GOLDEN_QUESTIONS) if (q.after) expect(() => goldenQuestion(q.after!)).not.toThrow();
  });

  it("cover every PRD use case", () => {
    const views = new Set(GOLDEN_QUESTIONS.flatMap((q) => (Array.isArray(q.expect.view) ? q.expect.view : [q.expect.view])));
    for (const view of ["list", "ranked", "comparison", "profile", "count", "no_match", "not_enough_information", "out_of_scope", "text"]) {
      expect(views, view).toContain(view);
    }
    expect(GOLDEN_QUESTIONS.some((q) => q.after)).toBe(true);
  });
});

describe.runIf(seeds.size === 30)("golden questions on the pilot pool", () => {
  const set = (id: string) => goldenQuestion(id).expect.candidates!(seeds);

  it.each([
    ["q01", 7],
    ["q03", 3],
    ["q04", 4],
    ["q05", 7],
    ["q06", 2],
    ["q07", 4],
    ["q08", 7],
    ["q10", 5],
    ["q11", 1],
    ["q12", 1],
    ["q13", 2],
    ["q14", 15],
    ["q16", 2],
    ["q17", 1],
    ["q18", 1],
    ["q20", 18],
    ["q24", 30],
    ["q26", 1],
    ["q27", 1],
    ["q30", 2],
    ["q31a", 19],
    ["q32a", 7],
    ["q35", 18],
    ["q37", 1],
    ["q39", 30],
    ["q40", 2],
    ["q41", 2],
    ["q42", 2],
    ["q43", 7],
  ])("%s expects %i candidates", (id, count) => {
    expect(set(id)).toHaveLength(count);
  });

  it("names the hard cases", () => {
    expect(set("q11")).toEqual(["ines-garcia"]);
    expect(set("q26")).toEqual(["viktor-ivanov"]);
    expect(set("q30")).toEqual(["lena-novak", "leon-fischer"]);
    expect(goldenQuestion("q19").expect.count!(seeds)).toBe(19);
    expect(goldenQuestion("q15").expect.mustInclude!(seeds)).toEqual(["daan-de-vries", "jane-doe"]);
    expect(goldenQuestion("q17").expect.textIncludes!(seeds)).toEqual(["Kinetix Digital"]);
    expect(goldenQuestion("q34").expect.atMost!(seeds)).toContain("ines-garcia");
    expect(set("q33").length).toBeGreaterThan(0);
    expect(set("q38").length).toBeGreaterThan(0);
    expect(set("q44").length).toBeGreaterThan(0);
    expect(goldenQuestion("q36").expect.first!(seeds)).toMatch(/^[a-z-]+$/);
  });
});
