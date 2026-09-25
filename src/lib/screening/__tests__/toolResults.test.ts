import { describe, expect, it } from "vitest";
import { ANDREI, LENA } from "@/mocks/sampleIndex";
import { ResultStore } from "../toolResults";

describe("ResultStore", () => {
  it("knows the candidates the tools returned, with the pages they were cited on, in order", () => {
    const store = new ResultStore();
    store.add({
      tool: "find_candidates",
      input: { filters: {}, scope: "whole_pool" },
      result: {
        matched: 2,
        total: 3,
        candidates: [
          { id: "andrei-popescu", name: "Andrei Popescu", headline: "x", evidence: [{ field: "skill", value: "Python (8 years)", page: 1, section: "skills" }] },
          { id: "lena-novak", name: "Lena Novak", headline: "y", evidence: [{ field: "language", value: "German (native)", page: 2, section: "languages" }] },
        ],
      },
    });
    store.add({ tool: "search_cv_text", input: { query: "x" }, result: [{ id: "lena-novak", name: "Lena Novak", headline: "y", section: "skills", page: 1, excerpt: "", score: 1 }] });
    expect(store.lastFilter?.tool).toBe("find_candidates");
    expect(store.lastSearch?.input.query).toBe("x");
    expect(store.knownIds).toEqual(["andrei-popescu", "lena-novak"]);
    expect(store.knows("elena-georgiou")).toBe(false);
    expect(store.citedPages("lena-novak")).toEqual([2, 1]);
    expect(store.summary).toEqual({ kind: "matched", count: 2, total: 3 });
    expect(store.exactCount).toBeUndefined();
  });

  it("counts a follow-up against the previous answer's size", () => {
    const store = new ResultStore(18);
    store.add({ tool: "find_candidates", input: { filters: { languages: [{ language: "German" }] }, scope: "previous_answer" }, result: { matched: 3, total: 30, candidates: [] } });
    expect(store.summary).toEqual({ kind: "matched", count: 3, total: 18 });
    store.add({ tool: "count_candidates", input: { filters: {}, scope: "previous_answer" }, result: { count: 3, total: 30 } });
    expect(store.exactCount).toEqual({ count: 3, total: 18 });
  });

  it("keeps the exact count, counts CVs read in full, and says nothing when no tool ran", () => {
    const store = new ResultStore();
    expect(store.summary).toBeNull();
    expect(store.toolsRan).toBe(false);
    store.add({ tool: "get_candidates", input: { ids: [LENA.id, ANDREI.id] }, result: [{ id: LENA.id, profile: LENA.profile, sources: LENA.sources, pages: LENA.pages }, { id: ANDREI.id, profile: ANDREI.profile, sources: ANDREI.sources, pages: ANDREI.pages }] });
    expect(store.summary).toEqual({ kind: "read", count: 2, total: 2 });
    expect(store.citedPages(LENA.id)).toEqual([1, 2]);
    store.add({ tool: "count_candidates", input: { filters: {}, scope: "whole_pool" }, result: { count: 19, total: 30 } });
    expect(store.exactCount).toEqual({ count: 19, total: 30 });
    expect(store.summary).toEqual({ kind: "matched", count: 19, total: 30 });
  });
});
