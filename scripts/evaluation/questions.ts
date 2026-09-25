import type { Seeds, GoldenQuestion } from "./types";
import {
  allIds,
  argmax,
  companies,
  country,
  hasAnySkill,
  hasCertificationContaining,
  hasSkill,
  ids,
  industries,
  institutions,
  intersection,
  languageLevel,
  levelRank,
  medianTenure,
  seniorityRank,
  skillYears,
  union,
} from "./rules";

// The golden questions (PLAN, Evaluation): every PRD use case and the hard
// cases, each with its expectation as a rule over the seeds. Ids are stable:
// reports and PLAN refer to them.

const withBoth = (seeds: Seeds) => ids(seeds, (s) => hasSkill(s, "React") && hasSkill(s, "TypeScript"));
const withReact = (seeds: Seeds) => ids(seeds, (s) => hasSkill(s, "React"));
const withPython = (seeds: Seeds) => ids(seeds, (s) => hasSkill(s, "Python"));
const speaks = (language: string) => (seeds: Seeds) => ids(seeds, (s) => languageLevel(s, language) !== undefined);
const frontendLeads = (seeds: Seeds) => ids(seeds, (s) => s.role === "frontend" && seniorityRank(s.seniority) >= seniorityRank("lead"));

export const GOLDEN_QUESTIONS: readonly GoldenQuestion[] = [
  // Filter (PRD use case 1)
  { id: "q01", kind: "exact", question: "Who has React and TypeScript?", expect: { view: "list", candidates: withBoth, section: "skills" } },
  {
    id: "q02",
    kind: "exact",
    question: "Who has 5+ years of React?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => (skillYears(s, "React") ?? 0) >= 5), section: "skills" },
  },
  {
    id: "q03",
    kind: "exact",
    question: "Who has under 2 years of experience?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.yearsTotal < 2), section: "summary" },
  },
  { id: "q04", kind: "exact", question: "Who speaks German?", expect: { view: "list", candidates: speaks("German"), section: "languages" } },
  {
    id: "q05",
    kind: "exact",
    question: "Who speaks English at C2 or better?",
    expect: {
      view: "list",
      candidates: (seeds) =>
        ids(seeds, (s) => {
          const level = languageLevel(s, "English");
          return level !== undefined && levelRank(level) >= levelRank("C2");
        }),
      section: "languages",
    },
  },
  { id: "q06", kind: "exact", question: "Who is based in Germany?", expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => country(s) === "Germany"), section: "header" } },
  { id: "q07", kind: "exact", question: "Show me the QA engineers", expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.role === "qa"), section: "header" } },
  {
    id: "q08",
    kind: "exact",
    question: "Who is lead or above?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => seniorityRank(s.seniority) >= seniorityRank("lead")), section: "header" },
  },
  { id: "q09", kind: "text", question: "Who is open to relocation?", expect: { view: "no_match", nextQuestion: true } },
  {
    id: "q10",
    kind: "exact",
    question: "Who can start within two weeks?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.availability <= 14), section: "header" },
  },
  {
    id: "q11",
    kind: "exact",
    question: "Which candidate graduated from UPC?",
    expect: { view: "profile", candidates: (seeds) => ids(seeds, (s) => institutions(s).includes("Universitat Politècnica de Catalunya")), section: "education" },
  },
  {
    id: "q12",
    kind: "exact",
    question: "Who studied at Trinity College Dublin?",
    expect: { view: "profile", candidates: (seeds) => ids(seeds, (s) => institutions(s).includes("Trinity College Dublin")), section: "education" },
  },
  {
    id: "q13",
    kind: "exact",
    question: "Who has a master's degree?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.education.some((e) => e.degree === "master")), section: "education" },
  },
  {
    id: "q14",
    kind: "exact",
    question: "Who is AWS certified?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => hasCertificationContaining(s, "AWS")), section: "certifications" },
  },
  // Rank (2)
  {
    id: "q15",
    kind: "exact",
    question: "Top 3 for a Frontend Lead role",
    expect: {
      view: "ranked",
      rows: 3,
      eligible: (seeds) => ids(seeds, (s) => s.role === "frontend" && (s.leadership.has || seniorityRank(s.seniority) >= seniorityRank("senior"))),
      mustInclude: frontendLeads,
    },
  },
  // Compare (3)
  {
    id: "q16",
    kind: "exact",
    question: "Compare Andrei and Elena on backend experience",
    expect: { view: "comparison", candidates: () => ["andrei-popescu", "elena-georgiou"] },
  },
  // Single fact (4)
  {
    id: "q17",
    kind: "exact",
    question: "Where did Lena work last?",
    expect: {
      view: "profile",
      candidates: () => ["lena-novak"],
      section: "experience",
      textIncludes: (seeds) => [companies(seeds.get("lena-novak")!)[0] ?? ""],
    },
  },
  // Profile summary (5)
  { id: "q18", kind: "exact", question: "Summarize Jane Doe's profile", expect: { view: "profile", candidates: () => ["jane-doe"] } },
  // Aggregate (6)
  { id: "q19", kind: "exact", question: "How many candidates know Python?", expect: { view: "count", count: (seeds) => withPython(seeds).length, candidates: withPython } },
  {
    id: "q20",
    kind: "exact",
    question: "How many know Docker? List them.",
    expect: {
      view: "count",
      count: (seeds) => ids(seeds, (s) => hasSkill(s, "Docker")).length,
      candidates: (seeds) => ids(seeds, (s) => hasSkill(s, "Docker")),
      rowsRequired: true,
      section: "skills",
    },
  },
  // Empty result (7) and out of scope (8)
  { id: "q21", kind: "text", question: "Who knows Rust?", expect: { view: "no_match", nextQuestion: true } },
  { id: "q22", kind: "text", question: "What's the weather today?", expect: { view: "out_of_scope", nextQuestion: true } },
  { id: "q23", kind: "text", question: "What salary does Lena expect?", expect: { view: "not_enough_information", sourcesWithin: () => ["lena-novak"] } },
  // List all (9)
  { id: "q24", kind: "exact", question: "Show all CVs", expect: { view: "list", candidates: allIds } },
  { id: "q25", kind: "exact", question: "show my all cvs", expect: { view: "list", candidates: allIds } },
  // Lookup by role (10)
  { id: "q26", kind: "exact", question: "Get the CV of the security role", expect: { view: "profile", candidates: (seeds) => ids(seeds, (s) => s.role === "security") } },
  { id: "q27", kind: "exact", question: "Who is the mobile engineer?", expect: { view: "profile", candidates: (seeds) => ids(seeds, (s) => s.role === "mobile") } },
  // Greeting and help (12)
  { id: "q28", kind: "text", question: "hey", expect: { view: "text" } },
  { id: "q29", kind: "text", question: "What can you do?", expect: { view: "text" } },
  // Follow-ups (11)
  {
    id: "q30",
    kind: "exact",
    question: "Of those, who speaks German?",
    after: "q01",
    expect: { view: "list", candidates: (seeds) => intersection(withBoth(seeds), speaks("German")(seeds)), section: "languages" },
  },
  { id: "q31a", kind: "exact", question: "Who knows Python?", expect: { view: "list", candidates: withPython, section: "skills" } },
  { id: "q31", kind: "text", question: "Of those, who speaks Japanese?", after: "q31a", expect: { view: "no_match", nextQuestion: true } },
  { id: "q32a", kind: "exact", question: "Who has React?", expect: { view: "list", candidates: withReact, section: "skills" } },
  {
    id: "q32",
    kind: "exact",
    question: "and 5+ years?",
    after: "q32a",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => (skillYears(s, "React") ?? 0) >= 5), section: "skills" },
  },
  // Free text over the CVs
  {
    id: "q33",
    kind: "exact",
    question: "Who has worked in fintech?",
    expect: {
      view: "list",
      candidates: (seeds) => ids(seeds, (s) => industries(s).some((industry) => ["FinTech", "Financial Technology"].includes(industry))),
      section: "experience",
    },
  },
  {
    id: "q34",
    kind: "free",
    question: "Who has built machine learning models?",
    expect: {
      view: "list",
      atLeast: () => ["ines-garcia"],
      atMost: (seeds) =>
        union(
          ids(seeds, (s) => s.role === "data"),
          ids(seeds, (s) => hasAnySkill(s, ["PyTorch", "TensorFlow", "scikit-learn", "Machine Learning"])),
        ),
    },
  },
  // Ranking signals (PRD §6)
  { id: "q35", kind: "exact", question: "Who has leadership experience?", expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.leadership.has), section: "leadership" } },
  {
    id: "q36",
    kind: "exact",
    question: "Who has the most stable job history?",
    expect: { view: "ranked", eligible: allIds, first: (seeds) => argmax(seeds, medianTenure) },
  },
  {
    id: "q37",
    kind: "exact",
    question: "Who worked at Kinetix Digital?",
    expect: { view: "profile", candidates: (seeds) => ids(seeds, (s) => companies(s).includes("Kinetix Digital")), section: "experience" },
  },
  {
    id: "q38",
    kind: "exact",
    question: "Who knows Kotlin or Swift?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => hasAnySkill(s, ["Kotlin", "Swift"])), section: "skills" },
  },
  {
    id: "q39",
    kind: "exact",
    question: "Who has a notice period of 30 days or less?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.availability <= 30), section: "header" },
  },
  {
    id: "q40",
    kind: "exact",
    question: "Who has more than 10 years of experience?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.yearsTotal > 10), section: "summary" },
  },
  {
    id: "q41",
    kind: "exact",
    question: "Senior backend engineers in Denmark or Romania",
    expect: {
      view: "list",
      candidates: (seeds) => ids(seeds, (s) => s.role === "backend" && s.seniority === "senior" && ["Denmark", "Romania"].includes(country(s))),
      section: "header",
    },
  },
  {
    id: "q42",
    kind: "exact",
    question: "Compare the two data engineers",
    expect: { view: "comparison", candidates: (seeds) => ids(seeds, (s) => s.headline.includes("Data Engineer")) },
  },
  { id: "q43", kind: "exact", question: "who knows postgress", expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => hasSkill(s, "PostgreSQL")), section: "skills" } },
  {
    id: "q44",
    kind: "exact",
    question: "Which frontend candidates have a certification?",
    expect: { view: "list", candidates: (seeds) => ids(seeds, (s) => s.role === "frontend" && s.certifications.length > 0), section: "certifications" },
  },
];

export function goldenQuestion(id: string): GoldenQuestion {
  const question = GOLDEN_QUESTIONS.find((q) => q.id === id);
  if (!question) throw new Error(`No golden question ${id}`);
  return question;
}
