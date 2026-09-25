// The example questions the empty state's composer types in turn (PRD, Core
// flow: Entry), one per answer shape a recruiter meets first: a filter, a
// count, a comparison, a profile, a lookup. Each is a golden question
// (scripts/evaluation/questions.ts), so each is known to work.
export const EXAMPLE_QUESTIONS: readonly string[] = [
  "Who has 5+ years of React?",
  "How many candidates know Python?",
  "Compare Andrei and Elena on backend experience",
  "Summarize Jane Doe's profile",
  "Which candidate graduated from UPC?",
];

/** The one shown still, where nothing may move. */
export const EXAMPLE_QUESTION = EXAMPLE_QUESTIONS[0];
