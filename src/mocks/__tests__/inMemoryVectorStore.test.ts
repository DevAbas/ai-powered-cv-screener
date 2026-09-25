import { describe, expect, it } from "vitest";
import type { ChunkMetadata } from "../../lib/search/vectorStore";
import { createInMemoryStore, matchesFilter } from "../inMemoryVectorStore";

const meta = (overrides: Partial<ChunkMetadata> = {}): ChunkMetadata => ({
  candidateId: "lena-novak",
  section: "skills",
  page: 1,
  role: "frontend",
  seniority: "senior",
  skills: ["React", "TypeScript"],
  languages: ["German", "English"],
  ...overrides,
});

describe("matchesFilter", () => {
  it("matches $eq and $in on scalar and list fields, and $and across them", () => {
    expect(matchesFilter(meta(), { role: { $eq: "frontend" } })).toBe(true);
    expect(matchesFilter(meta(), { role: { $eq: "backend" } })).toBe(false);
    expect(matchesFilter(meta(), { candidateId: { $in: ["lena-novak", "x"] } })).toBe(true);
    expect(matchesFilter(meta(), { skills: { $in: ["Python", "React"] } })).toBe(true);
    expect(matchesFilter(meta(), { skills: { $in: ["Python"] } })).toBe(false);
    expect(matchesFilter(meta(), { $and: [{ role: { $eq: "frontend" } }, { page: { $eq: 1 } }] })).toBe(true);
    expect(matchesFilter(meta(), { $and: [{ role: { $eq: "frontend" } }, { page: { $eq: 2 } }] })).toBe(false);
    expect(matchesFilter(meta())).toBe(true);
  });
});

describe("createInMemoryStore", () => {
  it("queries under a filter, lists by prefix and deletes", async () => {
    const store = createInMemoryStore([
      { id: "lena-novak:skills:1", values: [1, 0], metadata: meta() },
      { id: "lena-novak:experience:2", values: [0.9, 0.1], metadata: meta({ section: "experience", page: 2 }) },
      { id: "andrei-popescu:skills:1", values: [0, 1], metadata: meta({ candidateId: "andrei-popescu", role: "backend", skills: ["Python"] }) },
    ]);
    expect((await store.query([1, 0], 5, { role: { $eq: "frontend" } })).map((m) => m.id)).toEqual(["lena-novak:skills:1", "lena-novak:experience:2"]);
    expect((await store.query([1, 0], 5))[0]?.metadata?.candidateId).toBe("lena-novak");
    expect(await store.listIds("lena-novak:")).toHaveLength(2);
    await store.deleteMany(["lena-novak:skills:1"]);
    expect(await store.listIds()).toHaveLength(2);
    await store.deleteAll();
    expect(await store.listIds()).toEqual([]);
  });
});
