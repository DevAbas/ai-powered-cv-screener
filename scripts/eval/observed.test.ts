import { describe, expect, it } from "vitest";
import type { AskEvent } from "@/contracts/ask";
import type { RequestLog } from "@/lib/answering/log";
import { ANSWERS } from "@/mocks/answers";
import { observeAnswer } from "./observed";

const log = (overrides: Partial<RequestLog> = {}): RequestLog => ({
  event: "ask",
  requestId: "r",
  question: "q",
  model: { requested: "primary", used: "m", fellBack: false },
  steps: [],
  toolCalls: [],
  repairs: 0,
  modelFailures: [],
  candidatesReturned: ["jane-doe", "lena-novak", "sofia-almeida", "leon-fischer"],
  outcome: "answer",
  latencyMs: 1,
  counters: {},
  ...overrides,
});

const answer = (name: keyof typeof ANSWERS): AskEvent => ({ type: "answer", ...ANSWERS[name] });

describe("observeAnswer", () => {
  it("maps a list, a ranking, a count, a comparison, a profile and the states", () => {
    expect(observeAnswer([answer("filter")], log(), 10)).toMatchObject({ outcome: "answer", view: "list", presented: ["jane-doe", "lena-novak", "sofia-almeida", "leon-fischer"], toolCandidateIds: log().candidatesReturned });
    expect(observeAnswer([answer("rank")], log(), 10)).toMatchObject({ view: "ranked", reasons: [expect.stringContaining("Frontend Lead"), expect.any(String), expect.any(String)] });
    expect(observeAnswer([answer("count")], log(), 10)).toMatchObject({ view: "count", count: 6 });
    expect(observeAnswer([answer("compare")], log(), 10)).toMatchObject({ view: "comparison", presented: ["andrei-popescu", "elena-georgiou"] });
    expect(observeAnswer([answer("profile")], log(), 10)).toMatchObject({ view: "profile", presented: ["lena-novak"] });
    expect(observeAnswer([answer("empty")], log(), 10)).toMatchObject({ view: "no_match", presented: [], sources: [] });
    expect(observeAnswer([answer("insufficient")], log(), 10)).toMatchObject({ view: "not_enough_information" });
    expect(observeAnswer([answer("outOfScope")], log(), 10)).toMatchObject({ view: "out_of_scope" });
    const help = observeAnswer([answer("help")], log(), 10);
    expect(help.view).toBeUndefined();
    expect(help.presented).toEqual([]);
  });

  it("maps an error, carrying the ids the pipeline rejected", () => {
    const events: AskEvent[] = [{ type: "error", message: "I couldn't verify that answer against the CVs. Try again.", retryable: true }];
    expect(observeAnswer(events, log({ outcome: "error", rejectedCandidates: ["ghost"] }), 5)).toMatchObject({ outcome: "error", error: expect.stringContaining("verify"), rejected: ["ghost"], latencyMs: 5 });
    expect(observeAnswer([], undefined, 5)).toMatchObject({ outcome: "error", error: "no answer event", toolCandidateIds: [] });
  });
});
