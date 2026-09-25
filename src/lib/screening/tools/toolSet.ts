import { tool } from "ai";
import type { Filters, Scope } from "@/contracts";
import { findCandidatesInput, getCandidatesInput, presentInput, searchCvTextInput } from "@/contracts";
import type { CountResult } from "./countCandidates";
import { countCandidates } from "./countCandidates";
import type { FindResult } from "./findCandidates";
import { findCandidates } from "./findCandidates";
import type { CandidateDetails } from "./getCandidates";
import { getCandidates } from "./getCandidates";
import { modelSchema } from "./modelSchema";
import type { SearchResult } from "./searchCvText";
import { searchCvText } from "./searchCvText";
import type { ToolDeps } from "./toolDependencies";

// The tools the answer model calls (PLAN, Retrieval and answering). The
// exact ones run deterministic queries over the in-memory index; the text
// search is hybrid; `present` has no execute, so calling it ends the loop
// and the server builds the view from the results collected here. An
// input that fails its schema never reaches `execute`: the SDK returns the
// error to the model. What `execute` cannot do it says in plain words, for
// the model to act on.

/** The results a request's tools returned, with their inputs, in order. */
export type ToolResult =
  | { tool: "find_candidates"; input: { filters: Filters; scope: Scope }; result: FindResult }
  | { tool: "count_candidates"; input: { filters: Filters; scope: Scope }; result: CountResult }
  | { tool: "get_candidates"; input: { ids: readonly string[] }; result: CandidateDetails[] }
  | { tool: "search_cv_text"; input: { query: string }; result: SearchResult };

/** The tool set for one request; `onResult` sees every result as it is produced. */
export function createTools(deps: ToolDeps, onResult: (result: ToolResult) => void) {
  const v = deps.vocabulary;
  const previous = deps.previousIds.length > 0 ? `; previous_answer narrows the ${deps.previousIds.length} candidate(s) of the last answer` : "";
  return {
    find_candidates: tool({
      description: `Find the candidates matching exact criteria (skills, years, languages, role, seniority, location, education, employers, certifications, notice period, work mode, leadership, job stability); scope whole_pool searches everyone${previous}. Empty filters list every candidate. Returns each match with the evidence and its page.`,
      inputSchema: modelSchema(findCandidatesInput(v)),
      execute: async ({ filters, scope }) => {
        const result = findCandidates(filters, scope, deps);
        onResult({ tool: "find_candidates", input: { filters, scope }, result });
        return result;
      },
    }),
    count_candidates: tool({
      description: "Count the candidates matching exact criteria; the only source of a count. Same filters and scope as find_candidates.",
      inputSchema: modelSchema(findCandidatesInput(v)),
      execute: async ({ filters, scope }) => {
        const result = countCandidates(filters, scope, deps);
        onResult({ tool: "count_candidates", input: { filters, scope }, result });
        return result;
      },
    }),
    get_candidates: tool({
      description: "The full profile of one to five candidates by id (from the directory), with the page each field was read from: for a comparison, a profile summary or one fact.",
      inputSchema: modelSchema(getCandidatesInput(v)),
      execute: async ({ ids }) => {
        const result = getCandidates(ids, deps);
        onResult({ tool: "get_candidates", input: { ids }, result });
        return result;
      },
    }),
    search_cv_text: tool({
      description: `Search the CVs' text for what the exact criteria cannot express (a kind of work, a project, a phrase); optional filters and the scope narrow who is searched${previous}. Returns up to 10 candidates with the page and an excerpt that matched.`,
      inputSchema: modelSchema(searchCvTextInput(v)),
      execute: async ({ query, filters, scope, limit }) => {
        const result = await searchCvText(query, filters, scope, limit, deps);
        onResult({ tool: "search_cv_text", input: { query }, result });
        return result;
      },
    }),
    present: tool({
      description:
        "End your answer: name the view or state, the candidates to show by id with the page from the tool results, and the skills whose years to show. Call it once, in the same message as your answer text, after the tool results are in; never before. A reason is for a ranking only; leave it empty otherwise.",
      inputSchema: modelSchema(presentInput(v)),
    }),
  };
}

export type AnswerTools = ReturnType<typeof createTools>;
