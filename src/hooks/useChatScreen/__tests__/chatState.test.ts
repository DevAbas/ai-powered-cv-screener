import { describe, expect, it } from "vitest";
import { ANSWERS } from "@/mocks/answers";
import { initialChatState, isRunning, chatReducer } from "../chatState";
import type { ChatAction, ChatState } from "../chatState";

const run = (...actions: ChatAction[]): ChatState =>
  actions.reduce(chatReducer, initialChatState());

const asked: ChatAction = { type: "asked", exchangeId: "t1", question: "Who has React?" };

describe("chatReducer", () => {
  it("starts a running exchange", () => {
    const state = run(asked);
    expect(state.exchanges).toEqual([
      { id: "t1", question: "Who has React?", status: "running", steps: [], slow: false, text: "", sources: [], matched: undefined, answeredBy: undefined, error: undefined },
    ]);
    expect(isRunning(state)).toBe(true);
  });

  it("appends new stages and updates a repeated one", () => {
    const state = run(
      asked,
      { type: "progress", exchangeId: "t1", stage: "search", message: "Searching" },
      { type: "progress", exchangeId: "t1", stage: "write", message: "Writing" },
      { type: "progress", exchangeId: "t1", stage: "search", message: "Searching again" },
    );
    expect(state.exchanges[0].steps).toEqual([
      { stage: "search", message: "Searching again" },
      { stage: "write", message: "Writing" },
    ]);
  });

  it("builds the text as it streams", () => {
    const state = run(asked, { type: "delta", exchangeId: "t1", text: "Four " }, { type: "delta", exchangeId: "t1", text: "candidates" });
    expect(state.exchanges[0]).toMatchObject({ status: "running", text: "Four candidates" });
  });

  it("ends with the whole answer, its sources and CV count", () => {
    const state = run(asked, { type: "delta", exchangeId: "t1", text: "Four" }, { type: "answered", exchangeId: "t1", ...ANSWERS.filter });
    expect(state.exchanges[0]).toMatchObject({ status: "answered", ...ANSWERS.filter });
    expect(isRunning(state)).toBe(false);
  });

  it("ends with an error", () => {
    const state = run(asked, { type: "failed", exchangeId: "t1", message: "Timed out", retryable: true });
    expect(state.exchanges[0]).toMatchObject({ status: "error", error: { message: "Timed out", retryable: true } });
  });

  it("ignores events that arrive after Stop", () => {
    const state = run(
      asked,
      { type: "stopped", exchangeId: "t1" },
      { type: "delta", exchangeId: "t1", text: "late" },
      { type: "answered", exchangeId: "t1", ...ANSWERS.filter },
      { type: "slowNotice", exchangeId: "t1" },
    );
    expect(state.exchanges[0]).toMatchObject({ status: "stopped", text: "", sources: [], slow: false });
  });

  it("marks a slow request", () => {
    expect(run(asked, { type: "slowNotice", exchangeId: "t1" }).exchanges[0].slow).toBe(true);
  });

  it("reruns a exchange in place on retry", () => {
    const state = run(
      asked,
      { type: "progress", exchangeId: "t1", stage: "search", message: "Searching" },
      { type: "delta", exchangeId: "t1", text: "Half an ans" },
      { type: "failed", exchangeId: "t1", message: "Timed out", retryable: true },
      { type: "retried", exchangeId: "t1" },
    );
    expect(state.exchanges).toHaveLength(1);
    expect(state.exchanges[0]).toMatchObject({ status: "running", steps: [], text: "", error: undefined });
  });

});
