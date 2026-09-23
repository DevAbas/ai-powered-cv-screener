import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnswerSchema } from "@/contracts/answer";
import { AskEventSchema } from "@/contracts/ask";
import { ANSWERS, malformedAnswer } from "./answers";
import { mockAsk, scenarioFor } from "./ask";
import { findCandidate, MOCK_POOL } from "./pool";
import { SCENARIOS } from "./scenarios";
import { SUGGESTED_QUESTIONS } from "./suggestions";

const request = (question: string) => ({ question, model: "primary" as const, history: [] });

describe("answer fixtures", () => {
  it.each(Object.entries(ANSWERS))("%s parses with AnswerSchema", (_, answer) => {
    expect(AnswerSchema.safeParse(answer).success).toBe(true);
  });

  it("malformed fails AnswerSchema", () => {
    expect(AnswerSchema.safeParse(malformedAnswer).success).toBe(false);
  });

  it("cites only pool candidates and existing pages", () => {
    for (const answer of Object.values(ANSWERS)) {
      const cited = [
        ...(answer.candidates ?? []).map((c) => [c.candidateId, c.page] as const),
        ...(answer.fact ? [[answer.fact.candidateId, answer.fact.page] as const] : []),
        ...(answer.comparison?.candidateIds.map((id) => [id, 1] as const) ?? []),
        ...(answer.profile ? [[answer.profile.candidateId, 1] as const] : []),
      ];
      for (const [id, page] of cited) {
        const candidate = findCandidate(id);
        expect(candidate, id).toBeDefined();
        expect(page).toBeLessThanOrEqual(candidate?.pages ?? 0);
      }
    }
  });
});

describe("mock pool", () => {
  it("has 30 unique candidates", () => {
    expect(new Set(MOCK_POOL.map((c) => c.id)).size).toBe(30);
    expect(new Set(MOCK_POOL.map((c) => c.profile.name)).size).toBe(30);
  });
});

describe("scenarios", () => {
  it.each(Object.entries(SCENARIOS).filter(([name]) => name !== "malformed"))(
    "%s emits only valid events",
    (_, scenario) => {
      for (const step of scenario) expect(AskEventSchema.safeParse(step.event).success).toBe(true);
    },
  );

  it("each ends with at most one answer or error, and only at the end", () => {
    for (const scenario of Object.values(SCENARIOS)) {
      const terminal = scenario.map((s) => (s.event as { type: string }).type).filter((t) => t !== "progress");
      expect(terminal.length).toBeLessThanOrEqual(1);
      if (terminal.length) expect((scenario.at(-1)?.event as { type: string }).type).not.toBe("progress");
    }
  });

  it("routes the suggested questions and PRD examples", () => {
    expect(SUGGESTED_QUESTIONS.map(scenarioFor)).toEqual(["filter", "rank", "compare", "count"]);
    expect(scenarioFor("Where did Lena work last?")).toBe("fact");
    expect(scenarioFor("Summarize Jane Doe's profile")).toBe("profile");
    expect(scenarioFor("Who knows Rust?")).toBe("empty");
    expect(scenarioFor("What's the weather today?")).toBe("outOfScope");
    expect(scenarioFor("Of those, who speaks German?")).toBe("followUp");
    expect(scenarioFor("very slow question")).toBe("verySlow");
  });
});

describe("mockAsk", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("replays the scenario in order", async () => {
    const events: unknown[] = [];
    const run = (async () => {
      for await (const event of mockAsk(request("Who has React?"), new AbortController().signal)) events.push(event);
    })();
    await vi.runAllTimersAsync();
    await run;
    expect(events).toEqual(SCENARIOS.filter.map((s) => s.event));
  });

  it("stops on abort without emitting more events", async () => {
    const controller = new AbortController();
    const events: unknown[] = [];
    const run = (async () => {
      for await (const event of mockAsk(request("Who has React?"), controller.signal)) events.push(event);
    })();
    const outcome = run.then(
      () => "done",
      (error: unknown) => (error instanceof DOMException ? error.name : "other"),
    );
    await vi.advanceTimersByTimeAsync(200);
    controller.abort();
    await vi.runAllTimersAsync();
    expect(await outcome).toBe("AbortError");
    expect(events).toHaveLength(1);
  });
});
