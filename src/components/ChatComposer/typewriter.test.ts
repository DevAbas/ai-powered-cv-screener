import { describe, expect, it } from "vitest";
import { delayFor, INITIAL_STATE, nextStep, shownText, TYPING } from "./typewriter";
import type { TypedState } from "./typewriter";

const TEXTS = ["Hi", "Yo"];

/** Runs the machine, collecting what is shown and how long each state lasts. */
function run(steps: number, texts = TEXTS): { shown: string; delay: number; phase: TypedState["phase"] }[] {
  const frames = [];
  let state = INITIAL_STATE;
  for (let i = 0; i < steps; i++) {
    frames.push({ shown: shownText(state, texts), delay: delayFor(state), phase: state.phase });
    state = nextStep(state, texts);
  }
  return frames;
}

describe("typewriter", () => {
  it("types a character per step, holds the full text, deletes a character per step, rests, then starts the next text", () => {
    const frames = run(10);
    expect(frames.map((f) => f.shown)).toEqual(["", "H", "Hi", "Hi", "Hi", "H", "", "", "", "Y"]);
    expect(frames.map((f) => f.phase)).toEqual(["typing", "typing", "typing", "holding", "deleting", "deleting", "deleting", "resting", "typing", "typing"]);
  });

  it("waits the design's times in each phase", () => {
    const frames = run(8);
    expect(frames[0].delay).toBe(TYPING.typeMs);
    expect(frames[3].delay).toBe(TYPING.holdMs);
    expect(frames[4].delay).toBe(TYPING.deleteMs);
    expect(frames[7].delay).toBe(TYPING.restMs);
  });

  it("loops back to the first text after the last", () => {
    // Eight states per two-letter text: the eighteenth frame is the first text's first letter again.
    const frames = run(18);
    expect(frames.at(-1)?.shown).toBe("H");
    expect(frames.at(-1)?.phase).toBe("typing");
  });

  it("stays put on an empty list", () => {
    expect(nextStep(INITIAL_STATE, [])).toEqual({ index: 0, length: 0, phase: "holding" });
    expect(shownText(INITIAL_STATE, [])).toBe("");
  });
});
