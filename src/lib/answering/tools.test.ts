import type { ToolExecutionOptions } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { Embedder } from "@/lib/ai/embedder";
import { vocabularyOf } from "@/lib/pool/vocabulary";
import { createBm25Index } from "@/lib/retrieval/bm25";
import { TEST_INDEX } from "@/lib/retrieval/fixtures";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import type { ToolDeps, ToolResult } from "./tools";
import { countCandidates, createTools, findCandidates, getCandidates, searchCvText } from "./tools";

const embedder: Embedder = { dimensions: 2, embedDocuments: vi.fn(async () => []), embedQuery: vi.fn(async () => [1, 0]) };

const deps = (previousIds: string[] = []): ToolDeps => ({
  entries: TEST_INDEX,
  vocabulary: vocabularyOf(TEST_INDEX),
  embedder,
  store: createInMemoryStore(
    TEST_INDEX.flatMap((entry) =>
      entry.chunks.map((chunk) => ({
        id: chunk.id,
        values: entry.id === "lena-novak" ? [1, 0] : [0, 1],
        metadata: { candidateId: entry.id, section: chunk.section, page: chunk.page, role: entry.profile.role, seniority: entry.profile.seniority, skills: [], languages: [] },
      })),
    ),
  ),
  bm25: createBm25Index(TEST_INDEX),
  previousIds,
});

describe("the exact tools", () => {
  it("find returns the matches with evidence and the pool size", () => {
    const result = findCandidates({ skills: [{ skill: "Python" }] }, "whole_pool", deps());
    expect(result.matched).toBe(2);
    expect(result.total).toBe(3);
    expect(result.candidates.map((c) => c.id)).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(result.candidates[0]?.evidence[0]).toMatchObject({ field: "skill", value: "Python (8 years)", page: 1 });
    expect(findCandidates({}, "whole_pool", deps()).matched).toBe(3);
  });

  it("count is the exact count of the same filter", () => {
    expect(countCandidates({ roles: ["backend"] }, "whole_pool", deps())).toEqual({ count: 2, total: 3 });
  });

  it("scopes a follow-up to the previous answer, and says so when there is none", () => {
    expect(findCandidates({ languages: [{ language: "German" }] }, "previous_answer", deps(["andrei-popescu", "lena-novak"])).candidates.map((c) => c.id)).toEqual(["lena-novak"]);
    expect(findCandidates({ languages: [{ language: "Japanese" }] }, "previous_answer", deps(["lena-novak"])).matched).toBe(0);
    expect(() => findCandidates({}, "previous_answer", deps())).toThrow(/no previous answer/);
  });

  it("get returns profiles with their sources, and names an unknown id", () => {
    const [lena] = getCandidates(["lena-novak"], deps());
    expect(lena?.profile.name).toBe("Lena Novak");
    expect(lena?.sources["skills.0"]).toMatchObject({ section: "skills", page: 1 });
    expect(() => getCandidates(["nobody"], deps())).toThrow(/No candidate has the id "nobody"/);
  });

  it("search narrows by filters and scope before searching the text", async () => {
    const hits = await searchCvText("engineer", { roles: ["backend"] }, "whole_pool", undefined, deps());
    expect(hits.map((hit) => hit.id).sort()).toEqual(["andrei-popescu", "elena-georgiou"]);
    expect(await searchCvText("engineer", { roles: ["backend"] }, "previous_answer", 5, deps(["lena-novak"]))).toEqual([]);
  });
});

describe("createTools", () => {
  it("defines the five tools, runs the four with execute, and reports every result", async () => {
    const results: ToolResult[] = [];
    const tools = createTools(deps(), (result) => results.push(result));
    expect(Object.keys(tools)).toEqual(["find_candidates", "count_candidates", "get_candidates", "search_cv_text", "present"]);
    expect(tools.present.execute).toBeUndefined();
    const options: ToolExecutionOptions<Record<string, unknown>> = { toolCallId: "call-1", messages: [], context: {} };
    await tools.find_candidates.execute!({ filters: { skills: [{ skill: "Go" }] }, scope: "whole_pool" }, options);
    await tools.count_candidates.execute!({ filters: {}, scope: "whole_pool" }, options);
    await tools.get_candidates.execute!({ ids: ["elena-georgiou"] }, options);
    await tools.search_cv_text.execute!({ query: "payments", scope: "whole_pool" }, options);
    expect(results.map((r) => r.tool)).toEqual(["find_candidates", "count_candidates", "get_candidates", "search_cv_text"]);
    expect(results[1]).toEqual({ tool: "count_candidates", input: { filters: {}, scope: "whole_pool" }, result: { count: 3, total: 3 } });
  });

  it("rejects an input outside the vocabulary before execute", async () => {
    const tools = createTools(deps(), () => {});
    const schema = tools.find_candidates.inputSchema;
    const parsed = "~standard" in schema ? await schema["~standard"].validate({ filters: { skills: [{ skill: "Rust" }] }, scope: "whole_pool" }) : { issues: [{}] };
    expect(parsed.issues?.length ?? 0).toBeGreaterThan(0);
  });
});
