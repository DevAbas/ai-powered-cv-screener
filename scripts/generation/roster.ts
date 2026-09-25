import type { CandidateId, Role, Seniority } from "@/contracts";
import { slugOf } from "./seedRules";

// The fixed part of every seed: the generator
// owns it, the mock pool mirrors it and `roster.test.ts` keeps them equal.
// EU names in EU locations; every character is in WinAnsi, which is all the
// built-in PDF fonts can encode.

export interface RosterCandidate {
  id: CandidateId;
  name: string;
  headline: string;
  role: Role;
  seniority: Seniority;
  /** "City, Country". */
  location: string;
}

/** Candidates per role. */
export const ROLE_MIX: Readonly<Record<Role, number>> = {
  frontend: 6,
  backend: 6,
  data: 4,
  devops: 4,
  qa: 4,
  product: 3,
  fullstack: 1,
  mobile: 1,
  security: 1,
  other: 0,
};

export const EU_COUNTRIES: readonly string[] = [
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
];

type RawRoster = readonly [name: string, headline: string, role: Role, seniority: Seniority, location: string];

const RAW: readonly RawRoster[] = [
  ["Lena Novak", "Senior Frontend Engineer", "frontend", "senior", "Berlin, Germany"],
  ["Jane Doe", "Frontend Lead", "frontend", "lead", "Dublin, Ireland"],
  ["Marco Bianchi", "Frontend Engineer", "frontend", "mid", "Milan, Italy"],
  ["Sofia Almeida", "Senior Frontend Developer", "frontend", "senior", "Lisbon, Portugal"],
  ["Tomasz Kowalski", "Junior Frontend Developer", "frontend", "junior", "Warsaw, Poland"],
  ["Daan de Vries", "Principal UI Engineer", "frontend", "principal", "Amsterdam, Netherlands"],
  ["Andrei Popescu", "Senior Backend Engineer", "backend", "senior", "Bucharest, Romania"],
  ["Elena Georgiou", "Backend Engineer", "backend", "mid", "Athens, Greece"],
  ["Petra Horvat", "Backend Lead", "backend", "lead", "Zagreb, Croatia"],
  ["Emma Larsen", "Senior Backend Developer", "backend", "senior", "Copenhagen, Denmark"],
  ["Kristaps Ozols", "Backend Engineer", "backend", "mid", "Riga, Latvia"],
  ["Domas Petrauskas", "Junior Backend Developer", "backend", "junior", "Vilnius, Lithuania"],
  ["Lucas Martin", "Senior Data Engineer", "data", "senior", "Paris, France"],
  ["Nikolett Szabó", "Data Scientist", "data", "mid", "Budapest, Hungary"],
  ["Jonas Weber", "Lead Data Engineer", "data", "lead", "Munich, Germany"],
  ["Inés García", "Machine Learning Engineer", "data", "senior", "Barcelona, Spain"],
  ["Andrej Zupan", "Senior DevOps Engineer", "devops", "senior", "Ljubljana, Slovenia"],
  ["Aino Virtanen", "Site Reliability Engineer", "devops", "mid", "Helsinki, Finland"],
  ["Pablo Ruiz", "DevOps Lead", "devops", "lead", "Madrid, Spain"],
  ["Anna Schmidt", "Platform Engineer", "devops", "mid", "Vienna, Austria"],
  ["Rasmus Tamm", "Senior QA Engineer", "qa", "senior", "Tallinn, Estonia"],
  ["Chloé Dubois", "QA Automation Engineer", "qa", "mid", "Lyon, France"],
  ["Bram Peeters", "QA Lead", "qa", "lead", "Antwerp, Belgium"],
  ["Hana Novotná", "Junior QA Engineer", "qa", "junior", "Prague, Czechia"],
  ["Sara Lindqvist", "Senior Product Manager", "product", "senior", "Stockholm, Sweden"],
  ["Luca Borg", "Product Owner", "product", "mid", "Valletta, Malta"],
  ["Maria Ioannou", "Head of Product", "product", "principal", "Nicosia, Cyprus"],
  ["Leon Fischer", "Senior Full-Stack Engineer", "fullstack", "senior", "Luxembourg, Luxembourg"],
  ["Zuzana Holubová", "Mobile Engineer", "mobile", "mid", "Bratislava, Slovakia"],
  ["Viktor Ivanov", "Application Security Engineer", "security", "senior", "Sofia, Bulgaria"],
];

export const ROSTER: readonly RosterCandidate[] = RAW.map(([name, headline, role, seniority, location]) => ({
  id: slugOf(name),
  name,
  headline,
  role,
  seniority,
  location,
}));
