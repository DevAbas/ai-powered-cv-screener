import { describe, expect, it, vi } from "vitest";
import type { AskEvent, AskRequest, HistoryTurn } from "@/contracts/ask";
import { AskEventSchema } from "@/contracts/ask";
import type { QueryPlan } from "@/contracts/query";
import type { Embedder } from "@/lib/ai/embedder";
import type { StreamedToolCall, StreamTextOptions, StreamTextResult } from "@/lib/ai/stream-text";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "@/lib/retrieval/fixtures";
import { pageTexts } from "@/lib/pool/chunks";
import { createInMemoryStore } from "@/lib/vector/in-memory";
import { VectorStoreError } from "@/lib/vector/vector-store";
import type { AnswerDeps } from "./answer-question";
import { answerQuestion } from "./answer-question";
import { constraintTokens, filterByConstraint, tryLexicalFilter } from "./filter";
import type { QueryPlanner } from "./plan";
import { priorCandidateIds, promoteLookupPlan, resolveQueryPlan, tryHeuristicQueryPlan } from "./plan";
import { buildInstructions, buildMessages, poolFacts } from "./prompt";
import type { RetrievedCv } from "./retrieve";
import { filterRelevantMatches, retrieve } from "./retrieve";
import { buildView, viewSources } from "./views";

const RETRIEVAL = { topK: 30, minTopScore: 0.5, minScore: 0.45 };

/** Vectors in three made-up directions: frontend, backend and "not about CVs". */
const VECTORS: Record<string, number[]> = {
  "lena-novak": [1, 0, 0],
  "andrei-popescu": [0, 1, 0],
  "elena-georgiou": [0.1, 0.9, 0],
};
const store = () =>
  createInMemoryStore(
    TEST_INDEX.map((entry) => ({
      id: entry.id,
      values: VECTORS[entry.id],
      metadata: { candidateId: entry.id, section: "header" as const, page: 1, role: entry.profile.role, seniority: entry.profile.seniority, skills: [], languages: [] },
    })),
  );

/** Embeds a query by keyword into the same three directions. */
const embedder: Embedder = {
  dimensions: 3,
  async embedDocuments(texts) {
    return texts.map(() => [0, 0, 1]);
  },
  async embedQuery(text) {
    if (/react|frontend/i.test(text)) return [1, 0, 0];
    if (/python|backend/i.test(text)) return [0, 1, 0];
    return [0, 0, 1];
  },
};

const turn = (question: string, answer: string, candidateIds: string[]): HistoryTurn => ({ question, answer, candidateIds });
const plan = (intent: QueryPlan["intent"], searchQuery: string, candidateName = ""): QueryPlan => ({ intent, searchQuery, candidateName });
const cvs = (...entries: (typeof TEST_INDEX)[number][]): RetrievedCv[] => entries.map((entry) => ({ entry, score: 0.6 }));

describe("constraintTokens", () => {
  it("keeps the words that can pick out a CV", () => {
    expect(constraintTokens("Which candidate graduated from UPC?")).toEqual(["upc"]);
    expect(constraintTokens("of these who know AWS")).toEqual(["aws"]);
    expect(constraintTokens("Who has C# and Node.js?")).toEqual(["c#", "node.js"]);
  });
});

describe("filterByConstraint and tryLexicalFilter", () => {
  const text = (e: (typeof TEST_INDEX)[number]) => pageTexts(e).join("\n");

  it("keeps the CVs holding every word, accents aside", () => {
    expect(filterByConstraint(TEST_INDEX, text, "of these who know Python").map((e) => e.id)).toEqual([ANDREI.id, ELENA.id]);
    expect(tryLexicalFilter(TEST_INDEX, text, "python and java")?.map((e) => e.id)).toEqual([ELENA.id]);
  });

  it("keeps everyone when there is no distinctive word, and gives null for no hits", () => {
    expect(filterByConstraint(TEST_INDEX, text, "of these")).toHaveLength(3);
    expect(tryLexicalFilter(TEST_INDEX, text, "Rust")).toBeNull();
    expect(tryLexicalFilter(TEST_INDEX, text, "of them")).toBeNull();
  });
});

describe("the query plan", () => {
  it("plans a first question by the hints alone", () => {
    expect(tryHeuristicQueryPlan("Who has experience with Python?", [], [])).toEqual(plan("search", "Who has experience with Python?"));
    expect(tryHeuristicQueryPlan("Tell me about Lena Novak", [], [])).toEqual(plan("lookup", "CV profile of Lena Novak", "Lena Novak"));
  });

  it("narrows the previous answer on a refine hint, keeping the earlier criteria", () => {
    const history = [turn("Who knows Python?", "Two.", [ANDREI.id, ELENA.id])];
    expect(tryHeuristicQueryPlan("Which of them speak Greek?", history, priorCandidateIds(history))).toEqual(
      plan("refine", "Who knows Python?; Which of them speak Greek?"),
    );
  });

  it("asks the model when the hints don't decide, and searches as typed if it fails", async () => {
    const history = [turn("Who knows Python?", "Two.", [ANDREI.id])];
    const prior = { ids: [ANDREI.id], names: [ANDREI.profile.name] };
    const planner = vi.fn<QueryPlanner>(async () => plan("search", "candidates with 5+ years of Python"));
    await expect(resolveQueryPlan("under 2 years?", history, prior, planner)).resolves.toEqual(plan("search", "candidates with 5+ years of Python"));
    expect(planner.mock.calls[0]?.[0]).toContain("Andrei Popescu");

    const failing = vi.fn(async () => Promise.reject(new Error("busy")));
    await expect(resolveQueryPlan("under 2 years?", history, prior, failing)).resolves.toEqual(plan("search", "under 2 years?"));
  });

  it("turns the model's refine into a search when there is nothing to narrow", async () => {
    const planner = vi.fn(async () => plan("refine", "React and AWS"));
    await expect(resolveQueryPlan("and AWS?", [turn("hi", "Hello!", [])], { ids: [], names: [] }, planner)).resolves.toEqual(plan("search", "React and AWS"));
  });

  it("promotes a search that names someone after a lookup cue", () => {
    expect(promoteLookupPlan(plan("search", "Andrei's background"), "tell me about Andrei")).toEqual(plan("lookup", "Andrei's background", "Andrei"));
    expect(promoteLookupPlan(plan("refine", "x"), "tell me about Andrei").intent).toBe("refine");
  });
});

describe("retrieve", () => {
  const deps = () => ({ index: TEST_INDEX, embedder, store: store() });
  const ids = (found: RetrievedCv[]) => found.map((r) => r.entry.id);

  it("keeps the CVs that hold every distinctive word of the query", async () => {
    expect(ids(await retrieve(plan("search", "Who knows Python?"), "", [], deps(), RETRIEVAL))).toEqual([ANDREI.id, ELENA.id]);
  });

  it("falls back to the scores when no CV holds the words, and to nothing for an off-topic message", async () => {
    expect(ids(await retrieve(plan("search", "backend engineers"), "", [], deps(), RETRIEVAL))).toEqual([ANDREI.id, ELENA.id]);
    expect(await retrieve(plan("search", "hello there"), "", [], deps(), RETRIEVAL)).toEqual([]);
  });

  it("finds a named person, even when the name was read with the verb before it", async () => {
    expect(ids(await retrieve(plan("lookup", "CV profile of Lena", "Lena"), "", [], deps(), RETRIEVAL))).toEqual([LENA.id]);
    const misread = plan("lookup", "CV profile of Summarize Lena Novak", "Summarize Lena Novak");
    expect(ids(await retrieve(misread, "Summarize Lena Novak's profile", [], deps(), RETRIEVAL))).toEqual([LENA.id]);
  });

  it("narrows the previous answer by the latest message's words, or leaves it to the model", async () => {
    const prior = [ANDREI.id, ELENA.id];
    expect(ids(await retrieve(plan("refine", "Python; of these who know Java"), "of these who know Java", prior, deps(), RETRIEVAL))).toEqual([ELENA.id]);
    expect(ids(await retrieve(plan("refine", "Python; which of them speak Greek"), "which of them speak Greek", prior, deps(), RETRIEVAL))).toEqual(prior);
  });

  it("keeps matches at the floor only when the best clears the top score", () => {
    const scored = (...scores: number[]) => scores.map((score, i) => ({ entry: TEST_INDEX[i], score }));
    expect(filterRelevantMatches(scored(0.6, 0.46, 0.44), RETRIEVAL)).toHaveLength(2);
    expect(filterRelevantMatches(scored(0.49, 0.48), RETRIEVAL)).toEqual([]);
  });
});

describe("buildView", () => {
  const retrieved = cvs(ANDREI, ELENA, LENA);
  const call = (toolName: string, input: unknown): StreamedToolCall => ({ toolName, input });

  it("lists the named candidates with their facts from the index, most years first", () => {
    const view = buildView(
      call("show_candidates", {
        candidates: [
          { id: ELENA.id, note: " Python at Aegean Pay ", page: 1 },
          { id: "nobody", note: "", page: 1 },
          { id: ANDREI.id, note: "", page: 9 },
          { id: ELENA.id, note: "again", page: 1 },
        ],
        skills: ["Python"],
        ranked: false,
      }),
      retrieved,
    );
    expect(view).toEqual({
      kind: "list",
      ranked: false,
      skills: ["Python"],
      rows: [
        { candidateId: ANDREI.id, name: "Andrei Popescu", headline: "Senior Backend Engineer", skills: [{ skill: "Python", years: 8 }], note: "", page: 1 },
        { candidateId: ELENA.id, name: "Elena Georgiou", headline: "Backend Engineer", skills: [{ skill: "Python", years: 3 }], note: "Python at Aegean Pay", page: 1 },
      ],
    });
    expect(viewSources(view)).toEqual([
      { candidateId: ANDREI.id, name: "Andrei Popescu", page: 1 },
      { candidateId: ELENA.id, name: "Elena Georgiou", page: 1 },
    ]);
  });

  it("keeps the model's order for a ranking, and a cited page that exists", () => {
    const view = buildView(
      call("show_candidates", { candidates: [{ id: LENA.id, note: "", page: 2 }, { id: ANDREI.id, note: "", page: 1 }], skills: ["Go"], ranked: true }),
      retrieved,
    );
    expect(view?.kind === "list" && view.rows.map((r) => [r.candidateId, r.page, r.skills[0]?.years])).toEqual([
      [LENA.id, 2, null],
      [ANDREI.id, 1, 4],
    ]);
  });

  it("builds a comparison, a profile and a state, and nothing from a call it can't use", () => {
    expect(buildView(call("show_comparison", { ids: [ANDREI.id, ELENA.id], skills: [] }), retrieved)?.kind).toBe("comparison");
    expect(buildView(call("show_profile", { id: LENA.id }), retrieved)).toMatchObject({ kind: "profile", candidate: { candidateId: LENA.id, page: 1 } });
    expect(buildView(call("report_status", { status: "no-match" }), retrieved)).toEqual({ kind: "status", status: "no-match" });

    expect(buildView(call("show_candidates", { candidates: [{ id: "nobody", note: "", page: 1 }], skills: [], ranked: false }), retrieved)).toBeUndefined();
    expect(buildView(call("show_comparison", { ids: [ANDREI.id, ANDREI.id], skills: [] }), retrieved)).toBeUndefined();
    expect(buildView(call("show_profile", { id: "nobody" }), retrieved)).toBeUndefined();
    expect(buildView(call("report_status", { status: "maybe" }), retrieved)).toBeUndefined();
    expect(buildView(call("delete_everything", {}), retrieved)).toBeUndefined();
  });
});

describe("prompt", () => {
  it("states the pool by role", () => {
    expect(poolFacts(TEST_INDEX)).toBe("3 CVs: 2 backend, 1 frontend");
  });

  it("gives each CV its id and page markers, and the mode note for a narrowing", () => {
    const text = buildInstructions(TEST_INDEX, cvs(LENA), "refine");
    expect(text).toContain("### Lena Novak (id: lena-novak): Senior Frontend Engineer, Berlin, Germany\n[Page 1]\nLena Novak");
    expect(text).toContain("[Page 2]\nEXPERIENCE");
    expect(text).toContain("only the candidates from that answer");
    expect(text).not.toContain("Andrei Popescu");
  });

  it("says plainly when no CV was retrieved, never that the CVs can't be accessed", () => {
    const text = buildInstructions(TEST_INDEX, [], "search");
    expect(text).toContain("(No matching CVs were retrieved.)");
    expect(text).toContain("never say you can't see or access the CVs");
  });

  it("sends the whole conversation as chat turns, then the question", () => {
    const history = [turn("Who has React?", "**Lena Novak**.", [LENA.id]), turn("hi", "", [])];
    expect(buildMessages(history, "Is she senior?")).toEqual([
      { role: "user", content: "Who has React?" },
      { role: "assistant", content: "**Lena Novak**." },
      { role: "user", content: "hi" },
      { role: "user", content: "Is she senior?" },
    ]);
  });
});

describe("answerQuestion", () => {
  const request = (question: string, history: HistoryTurn[] = []): AskRequest => ({ question, model: "primary", history });

  /** Streams `text` in two pieces through onDelta, as the model would, with an optional tool call. */
  const streaming = (text: string, toolCall?: StreamedToolCall) =>
    vi.fn(async (_entry: unknown, _request: unknown, options: StreamTextOptions): Promise<StreamTextResult> => {
      if (text) {
        options.onDelta(text.slice(0, 5));
        options.onDelta(text.slice(5));
      }
      return { text, toolCall, target: { provider: "google", vendor: "google", model: "m" }, fellBack: false };
    });

  const listCall: StreamedToolCall = {
    toolName: "show_candidates",
    input: { candidates: [{ id: ELENA.id, note: "", page: 1 }, { id: ANDREI.id, note: "", page: 1 }], skills: ["Python"], ranked: false },
  };

  async function run(question: string, deps: Partial<AnswerDeps> = {}, history: HistoryTurn[] = []) {
    const events: AskEvent[] = [];
    const all: AnswerDeps = {
      index: TEST_INDEX,
      embedder,
      store: store(),
      planQuery: vi.fn(async () => plan("search", question)),
      streamAnswer: streaming("Both know Python.", listCall),
      retrieval: RETRIEVAL,
      ...deps,
    };
    await answerQuestion(request(question, history), (e) => events.push(e), all, new AbortController().signal);
    return { events, deps: all };
  }

  it("streams progress and the text, then one answer with its view, sources and CV count", async () => {
    const { events } = await run("Who knows Python?");
    expect(events.map((e) => (e.type === "progress" ? `${e.type}:${e.stage}` : e.type))).toEqual([
      "progress:search",
      "progress:read",
      "progress:write",
      "delta",
      "delta",
      "answer",
    ]);
    const answer = events.at(-1);
    expect(answer).toMatchObject({ type: "answer", text: "Both know Python.", checked: 2, view: { kind: "list" } });
    expect(answer?.type === "answer" && answer.sources.map((s) => s.candidateId)).toEqual([ANDREI.id, ELENA.id]);
    expect(AskEventSchema.safeParse(answer).success).toBe(true);
  });

  it("sends the view tools, and accepts an answer that is only a view", async () => {
    const streamAnswer = streaming("", listCall);
    const { events } = await run("Who knows Python?", { streamAnswer });
    expect(Object.keys((streamAnswer.mock.calls[0]?.[1] as { tools: object }).tools)).toEqual([
      "show_candidates",
      "show_comparison",
      "show_profile",
      "report_status",
    ]);
    expect(events.at(-1)).toMatchObject({ type: "answer", text: "", view: { kind: "list" } });
  });

  it("answers in text alone, without CV cards, when the model shows nothing", async () => {
    const { events } = await run("hey", { streamAnswer: streaming("Hi! Ask me about your candidates.") });
    expect(events.at(-1)).toEqual({ type: "answer", text: "Hi! Ask me about your candidates.", view: undefined, sources: [], checked: 0 });
  });

  it("drops a call naming unknown candidates, and fails plainly when nothing is left", async () => {
    const unknown: StreamedToolCall = { toolName: "show_profile", input: { id: "nobody" } };
    const { events } = await run("Who knows Python?", { streamAnswer: streaming("", unknown) });
    expect(events.at(-1)).toEqual({ type: "error", message: "I couldn't answer that just now. Try again.", retryable: true });
  });

  it("turns a vector store failure into one plain retryable error", async () => {
    const failing = { ...store(), query: async () => Promise.reject(new VectorStoreError("Pinecone query failed: 503")) };
    const { events } = await run("Who knows Python?", { store: failing });
    expect(events.filter((e) => e.type === "answer" || e.type === "error")).toEqual([
      { type: "error", message: "I couldn't search the CVs just now. Try again in a moment.", retryable: true },
    ]);
  });

  it("ends without an event when the request is aborted", async () => {
    const controller = new AbortController();
    const events: AskEvent[] = [];
    const deps: AnswerDeps = {
      index: TEST_INDEX,
      embedder,
      store: store(),
      planQuery: vi.fn(),
      streamAnswer: vi.fn(async () => {
        controller.abort();
        throw new Error("aborted");
      }),
    };
    await answerQuestion(request("Who knows Python?"), (e) => events.push(e), deps, controller.signal);
    expect(events.filter((e) => e.type === "answer" || e.type === "error")).toEqual([]);
  });
});
