import { describe, expect, it } from "vitest";
import { ANDREI, LENA } from "@/lib/retrieval/fixtures";
import { ResultStore } from "./results";

describe("ResultStore", () => {
  it("knows the candidates the tools returned, with the pages they were cited on, in order", () => {
    const store = new ResultStore();
    store.add({
      tool: "find_candidates",
      result: {
        matched: 2,
        total: 3,
        candidates: [
          { id: "andrei-popescu", name: "Andrei Popescu", headline: "x", evidence: [{ field: "skill", value: "Python (8 years)", page: 1, section: "skills" }] },
          { id: "lena-novak", name: "Lena Novak", headline: "y", evidence: [{ field: "language", value: "German (native)", page: 2, section: "languages" }] },
        ],
      },
    });
    store.add({ tool: "search_cv_text", result: [{ id: "lena-novak", name: "Lena Novak", headline: "y", section: "skills", page: 1, excerpt: "", score: 1 }] });
    expect(store.knownIds).toEqual(["andrei-popescu", "lena-novak"]);
    expect(store.knows("elena-georgiou")).toBe(false);
    expect(store.citedPages("lena-novak")).toEqual([2, 1]);
    expect(store.summary).toEqual({ kind: "matched", count: 2, total: 3 });
    expect(store.exactCount).toBeUndefined();
  });

  it("keeps the exact count, counts CVs read in full, and says nothing when no tool ran", () => {
    const store = new ResultStore();
    expect(store.summary).toBeNull();
    expect(store.toolsRan).toBe(false);
    store.add({ tool: "get_candidates", result: [{ id: LENA.id, profile: LENA.profile, sources: LENA.sources, pages: LENA.pages }, { id: ANDREI.id, profile: ANDREI.profile, sources: ANDREI.sources, pages: ANDREI.pages }] });
    expect(store.summary).toEqual({ kind: "read", count: 2, total: 2 });
    expect(store.citedPages(LENA.id)).toEqual([1, 2]);
    store.add({ tool: "count_candidates", result: { count: 19, total: 30 } });
    expect(store.exactCount).toEqual({ count: 19, total: 30 });
    expect(store.summary).toEqual({ kind: "matched", count: 19, total: 30 });
  });
});
