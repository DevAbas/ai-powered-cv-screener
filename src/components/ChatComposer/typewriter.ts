// The typewriter behind the empty state's placeholder (DESIGN.md, Composer):
// each example question is typed, held, deleted, then the next; a pure
// step function, so the sequence is tested without timers. The timings are
// the design's, kept here beside the rule that reads them.

/** Milliseconds per step of each phase (DESIGN.md, Layout: motion). */
export const TYPING = {
  /** Per character typed. */
  typeMs: 75,
  /** The full question held before deleting. */
  holdMs: 1500,
  /** Per character deleted. */
  deleteMs: 30,
  /** Empty, before the next question starts. */
  restMs: 500,
} as const;

export type Phase = "typing" | "holding" | "deleting" | "resting";

export interface TypedState {
  /** Which text of the list. */
  index: number;
  /** How many characters of it are shown. */
  length: number;
  phase: Phase;
}

export const INITIAL_STATE: TypedState = { index: 0, length: 0, phase: "typing" };

/** The text on screen for a state. */
export function shownText(state: TypedState, texts: readonly string[]): string {
  return (texts[state.index] ?? "").slice(0, state.length);
}

/** How long the state stays before `nextStep`. */
export function delayFor(state: TypedState): number {
  switch (state.phase) {
    case "typing":
      return TYPING.typeMs;
    case "holding":
      return TYPING.holdMs;
    case "deleting":
      return TYPING.deleteMs;
    case "resting":
      return TYPING.restMs;
  }
}

/** The state after one step: one more character, the hold, one fewer, the rest, then the next text, looping. */
export function nextStep(state: TypedState, texts: readonly string[]): TypedState {
  const text = texts[state.index] ?? "";
  switch (state.phase) {
    case "typing":
      return state.length < text.length ? { ...state, length: state.length + 1 } : { ...state, phase: "holding" };
    case "holding":
      return { ...state, phase: "deleting" };
    case "deleting":
      return state.length > 0 ? { ...state, length: state.length - 1 } : { ...state, phase: "resting" };
    case "resting":
      return { index: texts.length ? (state.index + 1) % texts.length : 0, length: 0, phase: "typing" };
  }
}
