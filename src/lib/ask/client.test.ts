import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskEvent } from "@/contracts/ask";
import { ANSWERS } from "@/mocks/answers";
import { mockAsk } from "@/mocks/ask";
import { ask, readNdjson, UNREADABLE_ANSWER } from "./client";

const request = (question: string) => ({ question, model: "primary" as const, history: [] });

async function collect(question: string, signal = new AbortController().signal) {
  const events: AskEvent[] = [];
  const run = (async () => {
    for await (const event of ask(request(question), signal, mockAsk)) events.push(event);
  })();
  return { events, run };
}

describe("ask", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("streams progress and text, then the validated answer", async () => {
    const { events, run } = await collect("Who has React and TypeScript?");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toEqual({ type: "answer", ...ANSWERS.filter });
    expect(events.slice(0, -1).every((e) => e.type === "progress" || e.type === "delta")).toBe(true);
    const streamed = events.flatMap((e) => (e.type === "delta" ? [e.text] : [])).join("");
    expect(streamed).toBe(ANSWERS.filter.text);
  });

  it("turns an answer that fails the schema into a retryable error", async () => {
    const { events, run } = await collect("malformed");
    await vi.runAllTimersAsync();
    await run;
    expect(events.at(-1)).toEqual(UNREADABLE_ANSWER);
    expect(events.filter((e) => e.type === "answer" || e.type === "error")).toHaveLength(1);
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

/** A body delivered in the given chunks. */
function body(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function lines(stream: ReadableStream<Uint8Array>) {
  const values: unknown[] = [];
  for await (const value of readNdjson(stream)) values.push(value);
  return values;
}

describe("readNdjson", () => {
  it("yields one value per line across chunk boundaries", async () => {
    expect(await lines(body('{"a":1}\n{"b', '":2}\n', '{"c":3}'))).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("skips blank lines and yields undefined for a line that is not JSON", async () => {
    expect(await lines(body('{"a":1}\n\n<html>\n'))).toEqual([{ a: 1 }, undefined]);
  });

  it("turns a line that is not JSON into the unreadable-answer error", async () => {
    const transport = async function* () {
      yield* readNdjson(body("Internal Server Error"));
    };
    const events: AskEvent[] = [];
    for await (const event of ask(request("Who has React?"), new AbortController().signal, transport)) events.push(event);
    expect(events).toEqual([UNREADABLE_ANSWER]);
  });
});
