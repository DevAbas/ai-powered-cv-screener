import type { AskRequest } from "@/contracts/ask";
import type { ScenarioName } from "./scenarios";
import { SCENARIOS } from "./scenarios";

// Mock transport for the `ask` client module during the UI phase (PLAN, User
// interface). Yields raw events: validating them is the client's job.

/** First match wins. Dev paths first, so "slow" never reads as a filter question. */
const ROUTES: readonly (readonly [RegExp, ScenarioName])[] = [
  [/very slow/, "verySlow"],
  [/\bslow\b/, "slow"],
  [/malformed/, "malformed"],
  [/no answer/, "noAnswer"],
  [/unavailable/, "fatalError"],
  [/\berror\b/, "error"],
  [/weather|joke|news/, "outOfScope"],
  [/rust\b/, "empty"],
  [/salary/, "insufficient"],
  [/of those|of them/, "followUp"],
  [/compare/, "compare"],
  [/\btop\b|best|rank/, "rank"],
  [/how many.*germany/, "countOnly"],
  [/how many/, "count"],
  [/summari[sz]e|profile/, "profile"],
  [/where did|last work|work last/, "fact"],
];

export function scenarioFor(question: string): ScenarioName {
  const q = question.toLowerCase();
  return ROUTES.find(([pattern]) => pattern.test(q))?.[1] ?? "filter";
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
