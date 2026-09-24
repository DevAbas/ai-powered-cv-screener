import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/lib/ai/embedder";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import type { VectorRecord } from "@/lib/vector/vector-store";
import { createBm25Index } from "./bm25";
import { TEST_INDEX } from "./fixtures";
import { hybridSearch } from "./hybrid";

// Vectors in three made-up directions: frontend, backend and data; every
// chunk of a CV points where its candidate does.
const DIRECTIONS: Record<string, number[]> = { "lena-novak": [1, 0, 0], "andrei-popescu": [0, 1, 0], "elena-georgiou": [0.2, 0.8, 0] };

const records: VectorRecord[] = TEST_INDEX.flatMap((entry) =>
  entry.chunks.map((chunk) => ({
    id: chunk.id,
    values: DIRECTIONS[entry.id],
    metadata: { candidateId: entry.id, section: chunk.section, page: chunk.page, role: entry.profile.role, seniority: entry.profile.seniority, skills: [], languages: [] },
  })),
);

const embedder: Embedder = {
  dimensions: 3,
  embedDocuments: vi.fn(async () => []),
  embedQuery: vi.fn(async (text: string) => (/frontend|react/i.test(text) ? [1, 0, 0] : /backend|python|java/i.test(text) ? [0, 1, 0] : [0, 0, 1])),
};

const deps = () => ({ entries: TEST_INDEX, embedder, store: createInMemoryStore(records), bm25: createBm25Index(TEST_INDEX) });

describe("hybridSearch", () => {
  it("returns each candidate once with the best chunk's page, section and excerpt", async () => {
    const hits = await hybridSearch({ query: "backend engineer with Python" }, deps());
    expect(hits.map((hit) => hit.id).slice(0, 2).sort()).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(new Set(hits.map((hit) => hit.id)).size).toBe(hits.length);
    const andrei = hits.find((hit) => hit.id === "andrei-popescu");
    expect(andrei).toMatchObject({ name: "Andrei Popescu", page: 1 });
    expect(andrei?.excerpt.length).toBeGreaterThan(0);
  });

  it("ranks a keyword hit that the vectors miss", async () => {
    const hits = await hybridSearch({ query: "Kinetix Digital" }, deps());
    expect(hits[0]).toMatchObject({ id: "lena-novak", section: "experience", page: 2 });
  });

  it("stays within the scope, filtering the vector store by candidate id, and returns nothing for an empty scope", async () => {
    const d = deps();
    const spy = vi.spyOn(d.store, "query");
    const hits = await hybridSearch({ query: "frontend React", scope: new Set(["andrei-popescu", "elena-georgiou"]) }, d);
    expect(hits.map((hit) => hit.id)).not.toContain("lena-novak");
    expect(spy.mock.calls[0]?.[2]).toEqual({ candidateId: { $in: ["andrei-popescu", "elena-georgiou"] } });
    expect(await hybridSearch({ query: "anything", scope: new Set() }, d)).toEqual([]);
  });

  it("honours the limit", async () => {
    expect(await hybridSearch({ query: "engineer", limit: 1 }, deps())).toHaveLength(1);
  });
});
