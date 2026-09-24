import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/lib/ai/embedder";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "@/lib/retrieval/fixtures";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import { documentText, syncVectors } from "./vectors";

const embedder = (): Embedder & { embedDocuments: ReturnType<typeof vi.fn> } => ({
  dimensions: 2,
  embedDocuments: vi.fn(async (texts: readonly string[]) => texts.map((_, i) => [i + 1, 0])),
  embedQuery: vi.fn(async () => [1, 0]),
});

describe("syncVectors", () => {
  it("embeds every CV once, keyed by candidate id, with its name and file", async () => {
    const store = createInMemoryStore();
    const report = await syncVectors(TEST_INDEX, { embedder: embedder(), store }, { force: false });
    expect(report).toEqual({ done: ["andrei-popescu", "elena-georgiou", "lena-novak"], skipped: [] });
    expect(store.records.get("lena-novak")?.metadata).toEqual({ name: "Lena Novak", file: "/cvs/lena_novak_cv.pdf" });
  });

  it("skips what is stored, and replaces it when forced", async () => {
    const store = createInMemoryStore([{ id: LENA.id, values: [9, 9], metadata: { name: "Lena Novak", file: LENA.file } }]);
    const first = embedder();
    expect(await syncVectors(TEST_INDEX, { embedder: first, store }, { force: false })).toEqual({
      done: ["andrei-popescu", "elena-georgiou"],
      skipped: ["lena-novak"],
    });
    const again = embedder();
    await syncVectors(TEST_INDEX, { embedder: again, store }, { force: false });
    expect(again.embedDocuments).not.toHaveBeenCalled();
    await syncVectors(TEST_INDEX, { embedder: again, store }, { force: true, only: [LENA.id] });
    expect(store.records.get("lena-novak")?.values).toEqual([1, 0]);
  });

  it("limits the work to the ids asked for", async () => {
    const store = createInMemoryStore();
    const report = await syncVectors([ANDREI, ELENA, LENA], { embedder: embedder(), store }, { force: false, only: [ELENA.id] });
    expect(report.done).toEqual(["elena-georgiou"]);
  });

  it("embeds who the candidate is with the CV text", () => {
    expect(documentText(LENA).split("\n")[0]).toBe("Lena Novak: Senior Frontend Engineer, Berlin, Germany");
  });
});
