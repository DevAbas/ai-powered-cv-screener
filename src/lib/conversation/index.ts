// The conversation module (AGENTS.md, Conventions): what the recruiter asks
// and is shown, imported from `@/lib/conversation`. Names are
// listed, not `export *`: the scripts run as ES modules and Node only sees
// the names a CommonJS module declares itself.

export { skillLabel, listCaption, statusText, profileFacts, viewLines, answerAsText } from "./answerText";

export { UNREADABLE_ANSWER, ask, readNdjson, httpAsk } from "./askClient";
export type { AskTransport } from "./askClient";

export { EXAMPLE_QUESTION } from "./exampleQuestion";

export { STAGE_MESSAGES, toolMessage } from "./progressMessages";
