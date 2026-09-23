import { describe, expect, it } from "vitest";
import { ANSWERS } from "@/mocks/answers";
import { initialChatState, isRunning, chatReducer } from "./state";
import type { ChatAction, ChatState } from "./state";

const run = (...actions: ChatAction[]): ChatState =>
  actions.reduce(chatReducer, initialChatState("primary"));

const asked: ChatAction = { type: "asked", exchangeId: "t1", question: "Who has React?" };

describe("chatReducer", () => {
  it("starts a running exchange", () => {
    const state = run(asked);
    expect(state.exchanges).toEqual([
      { id: "t1", question: "Who has React?", status: "running", steps: [], slow: false, answer: undefined, error: undefined },
    ]);
    expect(isRunning(state)).toBe(true);
  });

  it("appends new stages and updates a repeated one", () => {
    const state = run(
      asked,
      { type: "progress", exchangeId: "t1", stage: "filter", message: "Filtering" },
      { type: "progress", exchangeId: "t1", stage: "compose", message: "Writing" },
      { type: "progress", exchangeId: "t1", stage: "filter", message: "Filtering again" },
    );
    expect(state.exchanges[0].steps).toEqual([
      { stage: "filter", message: "Filtering again" },
      { stage: "compose", message: "Writing" },
    ]);
  });

  it("ends with an answer", () => {
    const state = run(asked, { type: "answered", exchangeId: "t1", answer: ANSWERS.filter });
    expect(state.exchanges[0]).toMatchObject({ status: "answered", answer: ANSWERS.filter });
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
      { type: "answered", exchangeId: "t1", answer: ANSWERS.filter },
      { type: "slowNotice", exchangeId: "t1" },
    );
    expect(state.exchanges[0]).toMatchObject({ status: "stopped", answer: undefined, slow: false });
  });

  it("marks a slow request", () => {
    expect(run(asked, { type: "slowNotice", exchangeId: "t1" }).exchanges[0].slow).toBe(true);
  });

  it("reruns a exchange in place on retry", () => {
    const state = run(
      asked,
      { type: "progress", exchangeId: "t1", stage: "filter", message: "Filtering" },
      { type: "failed", exchangeId: "t1", message: "Timed out", retryable: true },
      { type: "retried", exchangeId: "t1" },
    );
    expect(state.exchanges).toHaveLength(1);
    expect(state.exchanges[0]).toMatchObject({ status: "running", steps: [], error: undefined });
  });

  it("changes the model", () => {
    expect(run({ type: "modelChanged", model: "alternative" }).model).toBe("alternative");
  });
});
