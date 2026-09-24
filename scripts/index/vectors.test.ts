import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/lib/ai/embedder";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "@/lib/retrieval/fixtures";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import { chunkDocumentText, chunkMetadata, syncVectors } from "./vectors";

const embedder = (): Embedder & { embedDocuments: ReturnType<typeof vi.fn> } => ({
  dimensions: 2,
  embedDocuments: vi.fn(async (texts: readonly string[]) => texts.map((_, i) => [i + 1, 0])),
  embedQuery: vi.fn(async () => [1, 0]),
});

const chunkCount = TEST_INDEX.reduce((n, entry) => n + entry.chunks.length, 0);

describe("syncVectors", () => {
  it("stores one record per chunk, keyed by the chunk id, with the metadata the search filters on", async () => {
    const store = createInMemoryStore();
    const report = await syncVectors(TEST_INDEX, { embedder: embedder(), store }, { force: false });
    expect(report).toEqual({ done: ["andrei-popescu", "elena-georgiou", "lena-novak"], skipped: [] });
    expect(store.records.size).toBe(chunkCount);
    expect(store.records.get("lena-novak:skills:1")?.metadata).toEqual({
      candidateId: "lena-novak",
      section: "skills",
      page: 1,
      role: "frontend",
      seniority: "senior",
      skills: ["React", "TypeScript", "HTML/CSS"],
      languages: ["German", "English"],
    });
  });

  it("skips a CV whose chunks are all stored, replaces a partial one, and redoes everything when forced", async () => {
    const store = createInMemoryStore();
    await syncVectors([LENA], { embedder: embedder(), store }, { force: false });
    await store.deleteMany(["lena-novak:skills:1"]);
    const again = embedder();
    expect(await syncVectors(TEST_INDEX, { embedder: again, store }, { force: false })).toEqual({
      done: ["andrei-popescu", "elena-georgiou", "lena-novak"],
      skipped: [],
    });
    const third = embedder();
    expect(await syncVectors(TEST_INDEX, { embedder: third, store }, { force: false })).toEqual({ done: [], skipped: ["andrei-popescu", "elena-georgiou", "lena-novak"] });
    expect(third.embedDocuments).not.toHaveBeenCalled();
    await syncVectors(TEST_INDEX, { embedder: third, store }, { force: true, only: [ELENA.id] });
    expect(third.embedDocuments).toHaveBeenCalledTimes(1);
    expect(store.records.size).toBe(chunkCount);
  });

  it("limits the work to the ids asked for", async () => {
    const store = createInMemoryStore();
    expect((await syncVectors([ANDREI, ELENA, LENA], { embedder: embedder(), store }, { force: false, only: [ELENA.id] })).done).toEqual(["elena-georgiou"]);
  });

  it("embeds who the candidate is with the chunk's text", () => {
    const chunk = LENA.chunks[0];
    expect(chunkDocumentText(LENA, chunk).split("\n")[0]).toBe("Lena Novak: Senior Frontend Engineer, Berlin, Germany");
    expect(chunkMetadata(LENA, chunk).page).toBe(1);
  });
});
