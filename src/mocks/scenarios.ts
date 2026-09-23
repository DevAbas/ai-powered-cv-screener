import type { Answer } from "@/contracts/answer";
import type { ProgressStage } from "@/contracts/ask";
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

/** Progress messages per stage; the tool calls in PLAN, Retrieval and answering. */
export const STAGE_MESSAGES: Record<ProgressStage, string> = {
  filter: "Filtering the pool",
  read: "Reading CVs",
  evidence: "Finding evidence pages",
  compose: "Writing the answer",
};

const progress = (stage: ProgressStage, after: number): MockStep => ({
  after,
  event: { type: "progress", stage, message: STAGE_MESSAGES[stage] },
});

/** Stages run for each answer kind, mirroring which tools it needs. */
const STAGES: Record<Answer["kind"], readonly ProgressStage[]> = {
  filter: ["filter", "evidence", "compose"],
  rank: ["filter", "read", "evidence", "compose"],
  compare: ["read", "evidence", "compose"],
  fact: ["read", "evidence", "compose"],
  profile: ["read", "compose"],
  count: ["filter", "compose"],
  empty: ["filter", "compose"],
  insufficient: ["read", "compose"],
  out_of_scope: ["compose"],
};

/**
 * Progress through the kind's stages, then one answer. `composeMs` is the
 * time spent after the last stage: a schema repair (slow) or a fallback model
 * (very slow) only makes it longer; neither is shown as a stage.
 */
function answered(answer: unknown, kind: Answer["kind"], composeMs = 800): Scenario {
  const stages = STAGES[kind].map((stage, i) => progress(stage, i === 0 ? 150 : 400));
  return [...stages, { after: composeMs, event: { type: "answer", answer } }];
}

export const SCENARIOS = {
  filter: answered(ANSWERS.filter, "filter"),
  followUp: answered(ANSWERS.followUp, "filter"),
  rank: answered(ANSWERS.rank, "rank"),
  compare: answered(ANSWERS.compare, "compare"),
  fact: answered(ANSWERS.fact, "fact"),
  profile: answered(ANSWERS.profile, "profile"),
  count: answered(ANSWERS.count, "count"),
  countOnly: answered(ANSWERS.countOnly, "count"),
  empty: answered(ANSWERS.empty, "empty"),
  insufficient: answered(ANSWERS.insufficient, "insufficient"),
  outOfScope: answered(ANSWERS.outOfScope, "out_of_scope"),
  /** ~6 s: the answer arrives after a schema repair. */
  slow: answered(ANSWERS.filter, "filter", 5_000),
  /** ~30 s: the answer arrives from the fallback model. */
  verySlow: answered(ANSWERS.filter, "filter", 29_000),
  malformed: answered(malformedAnswer, "filter"),
  /** The stream ends with neither an answer nor an error. */
  noAnswer: [progress("filter", 150), progress("compose", 400)],
  error: [
    progress("filter", 150),
    { after: 1_200, event: { type: "error", message: "The model did not respond in time. Try again.", retryable: true } },
  ],
  fatalError: [
    progress("filter", 150),
    { after: 400, event: { type: "error", message: "The question could not be processed.", retryable: false } },
  ],
} as const satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;
