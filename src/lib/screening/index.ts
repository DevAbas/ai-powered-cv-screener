// The screening module (AGENTS.md, Conventions): answering the recruiter's
// question, imported from `@/lib/screening`. Names are listed, not
// `export *`: the scripts run as ES modules and Node only sees the names a
// CommonJS module declares itself. `tools/` is internal to the module.

export { previousCandidateIds, answerQuestion } from "./questionAnswer";
export type { AnswerPool, AnswerDeps } from "./questionAnswer";

export { recordOutcome, counterSnapshot, resetCounters } from "./modelCounters";

export { logRequest, answerDeps } from "./answerDependencies";

export { errorEvent } from "./answerErrors";

export { join, rangeWords, describeFilters, leadSentence, searchLead } from "./leadSentence";
export type { LeadInput } from "./leadSentence";

export { STEP_LIMIT, TIMEOUTS } from "./answerLimits";

export { brief, summarize, modelLabel } from "./requestLog";
export type { ToolCallLog, StepLog, RequestLog } from "./requestLog";

export { EmptyAnswerError, StepLimitError, stripTemplateTags, runLoop } from "./answerLoop";
export type { LoopRequest, LoopResult } from "./answerLoop";

export { poolFacts, candidateDirectory, buildInstructions, buildMessages } from "./answerPrompt";

export { ResultStore } from "./toolResults";

export { UnverifiedAnswerError, PresentationError, skillYears, buildView } from "./answerView";
export type { BuiltView } from "./answerView";
