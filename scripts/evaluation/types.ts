import type { CandidateSeed, SectionName } from "@/contracts";

// The golden evaluation set: what each question expects,
// as rules over the seeds, so the expectations survive regeneration.

/** The seeds by candidate id: the ground truth the rules read. */
export type Seeds = ReadonlyMap<string, CandidateSeed>;

/** A rule computes an expectation from the seeds. */
export type Rule<T> = (seeds: Seeds) => T;

/** The view or state an answer must have; `text` is an answer with no view and no sources. */
export type ExpectedView = "list" | "ranked" | "comparison" | "profile" | "count" | "no_match" | "not_enough_information" | "out_of_scope" | "text";

export interface Expectation {
  /** One accepted view, or any of several. */
  view: ExpectedView | readonly ExpectedView[];
  /** The exact candidate set (exact questions). */
  candidates?: Rule<readonly string[]>;
  /** Bounds for a free-text question: `atLeast` ⊆ presented ⊆ `atMost`. */
  atLeast?: Rule<readonly string[]>;
  atMost?: Rule<readonly string[]>;
  /** The exact count a count view must show. */
  count?: Rule<number>;
  /** A count question that also asked for the list: the rows must equal `candidates`. */
  rowsRequired?: boolean;
  /** A ranked list: the number of rows, who may appear, who must appear, and who must come first. */
  rows?: number;
  eligible?: Rule<readonly string[]>;
  mustInclude?: Rule<readonly string[]>;
  first?: Rule<string>;
  /** Every cited page must be a page of this section of the candidate's CV. */
  section?: SectionName;
  /** Strings the answer text must contain (a fact question). */
  textIncludes?: Rule<readonly string[]>;
  /** The text ends with a next question. */
  nextQuestion?: boolean;
  /** Sources allowed on a state answer; none when omitted. */
  sourcesWithin?: Rule<readonly string[]>;
}

/** How the question's retrieval is scored. */
export type QuestionKind = "exact" | "free" | "text";

export interface GoldenQuestion {
  id: string;
  kind: QuestionKind;
  question: string;
  /** The id of the question this one follows up on; its answer is the history. */
  after?: string;
  expect: Expectation;
}
