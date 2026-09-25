import { describe, expect, it } from "vitest";
import { TEST_INDEX } from "@/mocks/sampleIndex";
import { createBm25Index, foldTerm } from "../bm25Index";

describe("foldTerm", () => {
  it("folds case and accents and nothing else", () => {
    expect(foldTerm("Politècnica")).toBe("politecnica");
    expect(foldTerm("Szabó")).toBe("szabo");
    expect(foldTerm("C++")).toBe("c++");
  });
});

describe("createBm25Index", () => {
  const index = createBm25Index(TEST_INDEX);

  it("indexes every chunk and ranks the chunks holding the query's words", () => {
    expect(index.size).toBe(TEST_INDEX.reduce((n, entry) => n + entry.chunks.length, 0));
    const hits = index.search("Python");
    expect(hits.map((hit) => hit.candidateId).sort()).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(hits[0]).toMatchObject({ section: "skills", page: 1 });
  });

  it("matches whole words only, case and accents aside", () => {
    expect(index.search("hey")).toEqual([]);
    expect(index.search("all")).toEqual([]);
    expect(index.search("react").map((hit) => hit.candidateId)).toEqual(["lena-novak"]);
    expect(index.search("Kinetix").map((hit) => hit.chunkId)).toEqual(["lena-novak:experience:2"]);
  });

  it("stays within the scope and honours the limit", () => {
    expect(index.search("Python", { scope: new Set(["elena-georgiou"]) }).map((hit) => hit.candidateId)).toEqual(["elena-georgiou"]);
    expect(index.search("engineer", { limit: 1 })).toHaveLength(1);
  });
});
