import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskEvent } from "@/contracts/ask";
import { ANSWERS } from "@/mocks/answers";
import { ask, UNREADABLE_ANSWER } from "./client";

const request = (question: string) => ({ question, model: "primary" as const, history: [] });

async function collect(question: string, signal = new AbortController().signal) {
  const events: AskEvent[] = [];
  const run = (async () => {
    for await (const event of ask(request(question), signal)) events.push(event);
  })();
  return { events, run };
}

describe("ask", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("streams progress, then the validated answer", async () => {
    const { events, run } = await collect("Who has React and TypeScript?");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toEqual({ type: "answer", answer: ANSWERS.filter });
    expect(events.slice(0, -1).every((e) => e.type === "progress")).toBe(true);
  });

  it("turns an answer that fails the schema into a retryable error", async () => {
    const { events, run } = await collect("malformed");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toEqual(UNREADABLE_ANSWER);
    expect(events.filter((e) => e.type !== "progress")).toHaveLength(1);
  });

  it("turns a stream without an answer into a retryable error", async () => {
    const { events, run } = await collect("no answer");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toEqual(UNREADABLE_ANSWER);
  });

  it("passes server errors through", async () => {
    const { events, run } = await collect("unavailable");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toMatchObject({ type: "error", retryable: false });
  });

  it("rejects an over-long question without calling the source", async () => {
    const { events, run } = await collect("x".repeat(501));
    await run;
    expect(events).toEqual([
      { type: "error", message: "The question is too long. Shorten it and ask again.", retryable: false },
    ]);
  });

  it("rejects on abort and yields nothing more", async () => {
    const controller = new AbortController();
    const { events, run } = await collect("Who has React?", controller.signal);
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
