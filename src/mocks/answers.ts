import type { Answer } from "@/contracts/answer";

// One answer per kind (PLAN, Design system: mocks), about candidates in
// MOCK_POOL. `malformed` fails AnswerSchema on purpose.

export const filterAnswer: Answer = {
  kind: "filter",
  summary: "4 candidates list both React and TypeScript.",
  candidates: [
    { candidateId: "lena-novak", name: "Lena Novak", reason: "React 6 years, TypeScript 5 years", page: 1 },
    { candidateId: "jane-doe", name: "Jane Doe", reason: "React and TypeScript in her last two roles", page: 2 },
    { candidateId: "sofia-almeida", name: "Sofia Almeida", reason: "React 4 years, TypeScript 3 years", page: 1 },
    { candidateId: "leon-fischer", name: "Leon Fischer", reason: "React with TypeScript on the frontend of a Node stack", page: 1 },
  ],
};

export const followUpAnswer: Answer = {
  kind: "filter",
  summary: "2 of those 4 speak German.",
  candidates: [
    { candidateId: "lena-novak", name: "Lena Novak", reason: "German, native", page: 2 },
    { candidateId: "leon-fischer", name: "Leon Fischer", reason: "German, C2", page: 2 },
  ],
};

export const rankAnswer: Answer = {
  kind: "rank",
  summary: "Top 3 for a Frontend Lead role, best first.",
  candidates: [
    { candidateId: "jane-doe", name: "Jane Doe", reason: "Leads a team of 6 frontend engineers; 9 years of React", page: 1 },
    { candidateId: "aiko-tanaka", name: "Aiko Tanaka", reason: "Principal UI engineer; owns the design system; mentors 4", page: 1 },
    { candidateId: "lena-novak", name: "Lena Novak", reason: "Senior, 8 years; led the migration to Next.js", page: 1 },
  ],
};

export const compareAnswer: Answer = {
  kind: "compare",
  summary: "Ali has more backend experience; Nigar has more event-streaming work.",
  comparison: {
    candidateIds: ["ali-hasanov", "nigar-mammadova"],
    rows: [
      { criterion: "Backend experience", a: "6 years", b: "4 years" },
      { criterion: "Languages", a: "Go, Python", b: "Java, Kotlin" },
      { criterion: "Data stores", a: "PostgreSQL, Redis", b: "PostgreSQL, Cassandra" },
      { criterion: "Messaging", a: "Kafka (2 years)", b: "Kafka (4 years), RabbitMQ" },
      { criterion: "Leadership", a: "Led a team of 3", b: "None stated" },
    ],
  },
};

export const factAnswer: Answer = {
  kind: "fact",
  summary: "Lena's last employer is Zalando.",
  fact: {
    text: "Senior Frontend Engineer at Zalando, Berlin, since 2022-03.",
    candidateId: "lena-novak",
    page: 1,
  },
};

export const profileAnswer: Answer = {
  kind: "profile",
  summary: "Jane Doe: frontend lead with 9 years of React, based in London.",
  profile: {
    candidateId: "jane-doe",
    headline: "Frontend Lead · 11 years total · London, open to hybrid",
    sections: [
      { title: "Experience", items: ["Frontend Lead, Monzo (2021–present)", "Senior Frontend Engineer, Deliveroo (2017–2021)"] },
      { title: "Skills", items: ["React (9 years)", "TypeScript (7 years)", "Next.js", "Accessibility"] },
      { title: "Languages", items: ["English, native", "French, B2"] },
      { title: "Education", items: ["BSc Computer Science, University of Manchester, 2013"] },
      { title: "Availability", items: ["Notice period: 30 days"] },
    ],
  },
};

export const countAnswer: Answer = {
  kind: "count",
  summary: "5 candidates know Python.",
  count: 5,
  candidates: [
    { candidateId: "ali-hasanov", name: "Ali Hasanov", reason: "Python 3 years", page: 1 },
    { candidateId: "lucas-martin", name: "Lucas Martin", reason: "Python 7 years", page: 1 },
    { candidateId: "fatima-zahra", name: "Fatima Zahra", reason: "Python 5 years", page: 1 },
    { candidateId: "jonas-weber", name: "Jonas Weber", reason: "Python 8 years", page: 1 },
    { candidateId: "mei-lin", name: "Mei Lin", reason: "Python 6 years", page: 1 },
  ],
};

export const countOnlyAnswer: Answer = {
  kind: "count",
  summary: "2 candidates are based in Germany.",
  count: 2,
};

export const emptyAnswer: Answer = {
  kind: "empty",
  summary: "No candidate in the pool lists Rust.",
};

export const insufficientAnswer: Answer = {
  kind: "insufficient",
  summary: "The CVs do not state salary expectations, so I can't answer that.",
};

export const outOfScopeAnswer: Answer = {
  kind: "out_of_scope",
  summary: "I can only answer questions about the CVs in the pool. Try asking who matches a skill or a role.",
};

/** Fails AnswerSchema: a filter answer must list candidates. */
export const malformedAnswer: unknown = {
  kind: "filter",
  summary: "Candidates who match.",
};

export const ANSWERS = {
  filter: filterAnswer,
  followUp: followUpAnswer,
  rank: rankAnswer,
  compare: compareAnswer,
  fact: factAnswer,
  profile: profileAnswer,
  count: countAnswer,
  countOnly: countOnlyAnswer,
  empty: emptyAnswer,
  insufficient: insufficientAnswer,
  outOfScope: outOfScopeAnswer,
} as const satisfies Record<string, Answer>;
