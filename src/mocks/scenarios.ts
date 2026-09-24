import { readingMessage, STAGE_MESSAGES } from "@/lib/ask/stages";
import type { MockAnswer } from "./answers";
import { ANSWERS, malformedAnswer } from "./answers";

// Timed event sequences the mock `ask` replays (PLAN, Design system: mocks).
// Events are `unknown` because the malformed path must reach the client's
// validation exactly as a bad server response would.

export interface MockStep {
  /** Milliseconds after the previous step. */
  after: number;
  event: unknown;
}

export type Scenario = readonly MockStep[];

/** The answer text as a model streams it: a few words per delta. */
function deltas(text: string, everyMs = 60): MockStep[] {
  const words = text.match(/\S+\s*/g) ?? [];
  const pieces: string[] = [];
  for (let i = 0; i < words.length; i += 3) pieces.push(words.slice(i, i + 3).join(""));
  return pieces.map((piece) => ({ after: everyMs, event: { type: "delta", text: piece } }));
}

/**
 * Search, read and write, the text as it streams, then the answer with its
 * view. `writeMs` delays the first word (a slow or fallback model), or the
 * answer itself when the model wrote only a view.
 */
function answered(answer: MockAnswer, writeMs = 600): Scenario {
  const [first, ...rest] = deltas(answer.text);
  return [
    { after: 150, event: { type: "progress", stage: "search", message: STAGE_MESSAGES.search } },
    ...(answer.checked > 0 ? [{ after: 350, event: { type: "progress", stage: "read", message: readingMessage(answer.checked) } }] : []),
    { after: 200, event: { type: "progress", stage: "write", message: STAGE_MESSAGES.write } },
    ...(first ? [{ ...first, after: writeMs }, ...rest] : []),
    { after: first ? 50 : writeMs, event: { type: "answer", ...answer } },
  ];
}

export const SCENARIOS = {
  filter: answered(ANSWERS.filter),
  followUp: answered(ANSWERS.followUp),
  rank: answered(ANSWERS.rank),
  compare: answered(ANSWERS.compare),
  fact: answered(ANSWERS.fact),
  profile: answered(ANSWERS.profile),
  count: answered(ANSWERS.count),
  empty: answered(ANSWERS.empty),
  insufficient: answered(ANSWERS.insufficient),
  help: answered(ANSWERS.help),
  outOfScope: answered(ANSWERS.outOfScope),
  /** ~6 s before the first word. */
  slow: answered(ANSWERS.filter, 5_000),
  /** ~30 s before the first word: the fallback model answered. */
  verySlow: answered(ANSWERS.filter, 29_000),
  malformed: [
    { after: 150, event: { type: "progress", stage: "search", message: STAGE_MESSAGES.search } },
    { after: 600, event: { type: "answer", ...malformedAnswer } },
  ],
  /** The stream ends with neither an answer nor an error. */
  noAnswer: [
    { after: 150, event: { type: "progress", stage: "search", message: STAGE_MESSAGES.search } },
    { after: 400, event: { type: "progress", stage: "write", message: STAGE_MESSAGES.write } },
  ],
  error: [
    { after: 150, event: { type: "progress", stage: "search", message: STAGE_MESSAGES.search } },
    { after: 1_200, event: { type: "error", message: "That took too long. Try again.", retryable: true } },
  ],
  fatalError: [
    { after: 150, event: { type: "progress", stage: "search", message: STAGE_MESSAGES.search } },
    { after: 400, event: { type: "error", message: "The question could not be sent.", retryable: false } },
  ],
} as const satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;
