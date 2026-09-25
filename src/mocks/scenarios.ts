import { STAGE_MESSAGES, toolMessage } from "@/lib/conversation";
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

const progress = (stage: string, message: string, after: number): MockStep => ({ after, event: { type: "progress", stage, message } });

/**
 * Understanding, the tool that ran, writing, then the answer with its view.
 * `writeMs` delays the answer (a slow or fallback model).
 */
function answered(answer: MockAnswer, writeMs = 600): Scenario {
  const counted = answer.view?.kind === "list" && answer.view.count !== undefined;
  const tool = !answer.matched
    ? undefined
    : answer.matched.kind === "read"
      ? toolMessage("get_candidates", { ids: Array.from({ length: answer.matched.count }) })
      : counted
        ? toolMessage("count_candidates")
        : toolMessage("find_candidates");
  return [
    progress("understand", STAGE_MESSAGES.understand, 150),
    ...(tool ? [progress("search", tool, 350)] : []),
    progress("write", STAGE_MESSAGES.write, 200),
    ...(answer.text ? [{ after: writeMs, event: { type: "delta", text: answer.text } }] : []),
    { after: answer.text ? 50 : writeMs, event: { type: "answer", ...answer } },
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
  countOnly: answered(ANSWERS.countOnly),
  empty: answered(ANSWERS.empty),
  insufficient: answered(ANSWERS.insufficient),
  help: answered(ANSWERS.help),
  outOfScope: answered(ANSWERS.outOfScope),
  /** ~6 s before the answer. */
  slow: answered(ANSWERS.filter, 5_000),
  /** ~30 s before the answer: the fallback model answered, and the line says so. */
  verySlow: answered(ANSWERS.fallback, 29_000),
  fallback: answered(ANSWERS.fallback),
  malformed: [progress("understand", STAGE_MESSAGES.understand, 150), { after: 600, event: { type: "answer", ...malformedAnswer } }],
  /** The stream ends with neither an answer nor an error. */
  noAnswer: [progress("understand", STAGE_MESSAGES.understand, 150), progress("write", STAGE_MESSAGES.write, 400)],
  error: [progress("understand", STAGE_MESSAGES.understand, 150), { after: 1_200, event: { type: "error", message: "That took too long. Try again.", retryable: true } }],
  fatalError: [progress("understand", STAGE_MESSAGES.understand, 150), { after: 400, event: { type: "error", message: "The question could not be sent.", retryable: false } }],
} as const satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;
