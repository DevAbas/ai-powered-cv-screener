import type { AskRequest } from "@/contracts/ask";
import { EXAMPLE_QUESTION } from "@/lib/chat/suggestions";
import type { ScenarioName } from "./scenarios";
import { SCENARIOS } from "./scenarios";

// Mock transport for the `ask` client module (PLAN, User interface): the
// component previews and the tests. Yields raw events: validating them is
// the client's job. A question is matched exactly against the example
// questions below; any other question replays the filter answer.

/** The example questions the previews and tests ask, and what each replays. */
export const EXAMPLE_QUESTIONS: Readonly<Record<string, ScenarioName>> = {
  [EXAMPLE_QUESTION]: "filter",
  "Who has React and TypeScript?": "filter",
  "Of those, who speaks German?": "followUp",
  "Top 3 for a Frontend Lead role": "rank",
  "Compare Andrei and Elena on backend experience": "compare",
  "Where did Lena work last?": "fact",
  "Summarize Jane Doe's profile": "profile",
  "How many candidates know Python?": "count",
  "How many know Python? Just the number.": "countOnly",
  "Who knows Rust?": "empty",
  "What salary does Lena expect?": "insufficient",
  "What can you do?": "help",
  "What's the weather today?": "outOfScope",
  "slow": "slow",
  "very slow": "verySlow",
  "fallback": "fallback",
  "malformed": "malformed",
  "no answer": "noAnswer",
  "error": "error",
  "unavailable": "fatalError",
};

export function scenarioFor(question: string): ScenarioName {
  return EXAMPLE_QUESTIONS[question.trim()] ?? "filter";
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Replays the scenario for the question; rejects with the abort reason on Stop. */
export async function* mockAsk(request: AskRequest, signal: AbortSignal): AsyncGenerator<unknown> {
  for (const step of SCENARIOS[scenarioFor(request.question)]) {
    await wait(step.after, signal);
    yield step.event;
  }
}
