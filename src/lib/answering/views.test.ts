import { describe, expect, it } from "vitest";
import type { PresentInput } from "@/contracts/tools";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "@/lib/retrieval/fixtures";
import { ResultStore } from "./results";
import { buildView, PresentationError, UnverifiedAnswerError } from "./views";

const byId = new Map(TEST_INDEX.map((entry) => [entry.id, entry]));

/** A store after find_candidates returned Andrei and Elena for Python, Lena for German. */
function store() {
  const s = new ResultStore();
  s.add({
    tool: "find_candidates",
    result: {
      matched: 2,
      total: 3,
      candidates: [
        { id: ANDREI.id, name: "Andrei Popescu", headline: "x", evidence: [{ field: "skill", value: "Python (8 years)", page: 1, section: "skills" }] },
        { id: ELENA.id, name: "Elena Georgiou", headline: "y", evidence: [{ field: "skill", value: "Python (3 years)", page: 1, section: "skills" }] },
      ],
    },
  });
  s.add({ tool: "get_candidates", result: [{ id: LENA.id, profile: LENA.profile, sources: LENA.sources, pages: LENA.pages }] });
  return s;
}

const present = (overrides: Partial<PresentInput>): PresentInput => ({ view: "list", candidates: [], skills: [], ...overrides });

describe("buildView", () => {
  it("builds a list in the tools' order with facts from the index and sources from the call", () => {
    const built = buildView(present({ candidates: [{ id: ELENA.id, page: 1, reason: " Python at Aegean Pay " }, { id: ANDREI.id, page: 1, reason: "" }], skills: ["Python"] }), store(), byId);
    expect(built.view).toEqual({
      kind: "list",
      ranked: false,
      skills: ["Python"],
      rows: [
        { candidateId: ANDREI.id, name: "Andrei Popescu", headline: "Senior Backend Engineer", skills: [{ skill: "Python", years: 8 }], reason: "", page: 1 },
        { candidateId: ELENA.id, name: "Elena Georgiou", headline: "Backend Engineer", skills: [{ skill: "Python", years: 3 }], reason: "Python at Aegean Pay", page: 1 },
      ],
    });
    expect(built.sources).toEqual([
      { candidateId: ANDREI.id, name: "Andrei Popescu", page: 1 },
      { candidateId: ELENA.id, name: "Elena Georgiou", page: 1 },
    ]);
    expect(built.corrections).toEqual([]);
  });

  it("keeps the model's order for a ranking and corrects a page the tools did not cite", () => {
    const built = buildView(present({ view: "ranked", candidates: [{ id: ELENA.id, page: 9, reason: "a" }, { id: ANDREI.id, page: 1, reason: "b" }] }), store(), byId);
    expect(built.view.kind === "list" && built.view.ranked).toBe(true);
    expect(built.view.kind === "list" && built.view.rows.map((r) => [r.candidateId, r.page])).toEqual([
      [ELENA.id, 1],
      [ANDREI.id, 1],
    ]);
    expect(built.corrections).toEqual(["elena-georgiou: page 9 corrected to 1"]);
  });

  it("fails on a candidate no tool returned, and on a view its results cannot fill", () => {
    expect(() => buildView(present({ candidates: [{ id: "nobody", page: 1, reason: "" }] }), store(), byId)).toThrow(UnverifiedAnswerError);
    expect(() => buildView(present({ candidates: [] }), store(), byId)).toThrow(PresentationError);
    expect(() => buildView(present({ view: "count", candidates: [] }), store(), byId)).toThrow(/count_candidates/);
    expect(() => buildView(present({ view: "comparison", candidates: [{ id: ANDREI.id, page: 1, reason: "" }] }), store(), byId)).toThrow(/exactly two/);
    expect(() => buildView(present({ view: "profile", candidates: [] }), store(), byId)).toThrow(/exactly one/);
  });

  it("builds a count from count_candidates, with or without the list", () => {
    const s = store();
    s.add({ tool: "count_candidates", result: { count: 2, total: 3 } });
    const withList = buildView(present({ view: "count", candidates: [{ id: ANDREI.id, page: 1, reason: "" }, { id: ELENA.id, page: 1, reason: "" }], skills: ["Python"] }), s, byId);
    expect(withList.view).toMatchObject({ kind: "list", count: { matched: 2, total: 3 } });
    expect(withList.sources).toHaveLength(2);
    const alone = buildView(present({ view: "count", candidates: [] }), s, byId);
    expect(alone.view).toMatchObject({ kind: "list", rows: [], count: { matched: 2, total: 3 } });
    expect(alone.sources).toEqual([]);
  });

  it("builds a comparison, a profile and the states", () => {
    const comparison = buildView(present({ view: "comparison", candidates: [{ id: ANDREI.id, page: 1, reason: "" }, { id: ELENA.id, page: 1, reason: "" }], skills: ["Python"] }), store(), byId);
    expect(comparison.view.kind).toBe("comparison");
    const profile = buildView(present({ view: "profile", candidates: [{ id: LENA.id, page: 2, reason: "" }] }), store(), byId);
    expect(profile.view).toMatchObject({ kind: "profile", candidate: { candidateId: LENA.id, page: 2 } });
    expect(buildView(present({ view: "no_match" }), store(), byId).view).toEqual({ kind: "status", status: "no-match" });
    expect(buildView(present({ view: "out_of_scope", candidates: [{ id: LENA.id, page: 1, reason: "" }] }), store(), byId)).toMatchObject({ sources: [], corrections: ["1 candidate(s) dropped from a out_of_scope state"] });
    const insufficient = buildView(present({ view: "not_enough_information", candidates: [{ id: LENA.id, page: 1, reason: "" }] }), store(), byId);
    expect(insufficient.view).toEqual({ kind: "status", status: "insufficient" });
    expect(insufficient.sources).toEqual([{ candidateId: LENA.id, name: "Lena Novak", page: 1 }]);
  });
});
