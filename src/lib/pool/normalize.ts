import type {
  CandidateProfile,
  Language,
  LanguageLevel,
  Role,
  Seniority,
  Skill,
} from "@/contracts/candidate";
import { LANGUAGE_LEVELS } from "@/contracts/candidate";

// Canonical names for skills, languages, roles and seniority. The same
// functions normalise extracted profiles (indexer) and query filters
// (search), so "ReactJS" in a CV matches "react.js" in a question.

/** Case-, whitespace- and punctuation-insensitive lookup key. Keeps `+` and `#` (C++, C#). */
export function aliasKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}+#]/gu, "");
}

function buildLookup(table: Record<string, readonly string[]>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(table)) {
    for (const name of [canonical, ...aliases]) lookup.set(aliasKey(name), canonical);
  }
  return lookup;
}

function tidy(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const SKILL_ALIASES: Record<string, readonly string[]> = {
  // Languages
  JavaScript: ["js", "ecmascript", "es6"],
  TypeScript: ["ts"],
  Python: ["python3", "py"],
  Java: [],
  Kotlin: [],
  Swift: [],
  "Objective-C": ["objc"],
  Go: ["golang"],
  Rust: [],
  "C#": ["csharp", "c sharp"],
  "C++": ["cpp"],
  Ruby: [],
  PHP: [],
  Dart: [],
  Scala: [],
  SQL: [],
  HTML: ["html5"],
  CSS: ["css3"],
  Sass: ["scss"],
  // Frontend and mobile
  React: ["reactjs", "react.js"],
  "React Native": ["reactnative", "rn"],
  "Next.js": ["next", "nextjs"],
  "Vue.js": ["vue", "vuejs"],
  Angular: ["angularjs", "angular 2+"],
  Svelte: ["sveltekit"],
  Redux: ["redux toolkit"],
  "Tailwind CSS": ["tailwind", "tailwindcss"],
  Webpack: [],
  Vite: [],
  Flutter: [],
  // Backend
  "Node.js": ["node", "nodejs"],
  Express: ["expressjs", "express.js"],
  NestJS: ["nest", "nest.js"],
  Django: [],
  Flask: [],
  FastAPI: [],
  "Spring Boot": ["spring", "springboot"],
  ".NET": ["dotnet", ".net core", "asp.net", "asp.net core"],
  "Ruby on Rails": ["rails", "ror"],
  Laravel: [],
  GraphQL: [],
  REST: ["rest api", "rest apis", "restful", "restful api"],
  gRPC: [],
  // Data stores and streaming
  PostgreSQL: ["postgres", "psql"],
  MySQL: [],
  MongoDB: ["mongo"],
  Redis: [],
  Elasticsearch: ["elastic search", "elastic"],
  Kafka: ["apache kafka"],
  RabbitMQ: [],
  // Data and ML
  Pandas: [],
  NumPy: [],
  "scikit-learn": ["sklearn", "scikit learn"],
  PyTorch: ["torch"],
  TensorFlow: [],
  "Apache Spark": ["spark", "pyspark"],
  Airflow: ["apache airflow"],
  dbt: ["data build tool"],
  Snowflake: [],
  BigQuery: ["big query"],
  Tableau: [],
  "Power BI": ["powerbi"],
  "Machine Learning": ["ml"],
  // DevOps and cloud
  Docker: [],
  Kubernetes: ["k8s", "kube"],
  Terraform: [],
  Ansible: [],
  AWS: ["amazon web services"],
  GCP: ["google cloud", "google cloud platform"],
  Azure: ["microsoft azure"],
  "CI/CD": ["cicd", "ci cd", "continuous integration"],
  "GitHub Actions": [],
  Jenkins: [],
  "GitLab CI": ["gitlab ci/cd"],
  Linux: [],
  Prometheus: [],
  Grafana: [],
  Git: [],
  // QA
  Selenium: ["selenium webdriver"],
  Cypress: [],
  Playwright: [],
  Jest: [],
  JUnit: [],
  Appium: [],
  Postman: [],
  // Security
  OWASP: [],
  "Penetration Testing": ["pentesting", "pen testing", "pentest"],
  "Burp Suite": ["burp"],
  SIEM: [],
  // Product and process
  Jira: [],
  Figma: [],
  Agile: [],
  Scrum: [],
};

const LANGUAGE_ALIASES: Record<string, readonly string[]> = {
  English: ["en", "eng"],
  German: ["deutsch", "de"],
  French: ["français", "francais", "fr"],
  Spanish: ["español", "espanol", "castellano", "es"],
  Italian: ["italiano", "it"],
  Portuguese: ["português", "portugues", "pt"],
  Dutch: ["nederlands", "nl"],
  Polish: ["polski", "pl"],
  Russian: ["русский", "ru"],
  Ukrainian: ["українська", "uk"],
  Turkish: ["türkçe", "turkce", "tr"],
  Azerbaijani: ["azeri", "azərbaycan", "azerbaijan", "az"],
  Swedish: ["svenska", "sv"],
  Danish: ["dansk", "da"],
  Norwegian: ["norsk", "no"],
  Finnish: ["suomi", "fi"],
  Estonian: ["eesti", "et"],
  Latvian: ["latviešu", "latviesu", "lv"],
  Lithuanian: ["lietuvių", "lietuviu", "lt"],
  Czech: ["čeština", "cestina", "cs"],
  Slovak: ["slovenčina", "slovencina", "sk"],
  Hungarian: ["magyar", "hu"],
  Romanian: ["română", "romana", "ro"],
  Bulgarian: ["български", "bg"],
  Croatian: ["hrvatski", "hr"],
  Slovene: ["slovenian", "slovenščina", "slovenscina", "sl"],
  Greek: ["ελληνικά", "el"],
  Maltese: ["malti", "mt"],
  Irish: ["gaeilge", "irish gaelic", "ga"],
  Luxembourgish: ["lëtzebuergesch", "letzebuergesch", "lb"],
  Arabic: ["ar"],
  Hindi: ["hi"],
  Chinese: ["mandarin", "mandarin chinese", "zh"],
  Japanese: ["ja"],
};

const SKILLS = buildLookup(SKILL_ALIASES);
const LANGUAGES = buildLookup(LANGUAGE_ALIASES);

/** Canonical skill name; unknown skills are kept, trimmed. */
export function normalizeSkill(name: string): string {
  return SKILLS.get(aliasKey(name)) ?? tidy(name);
}

/** Canonical language name in English; unknown languages are kept, trimmed. */
export function normalizeLanguage(name: string): string {
  return LANGUAGES.get(aliasKey(name)) ?? tidy(name);
}

// First match wins, so the order matters: "Senior Software Engineer in Test"
// is qa, "React Native Developer" is mobile, "Full-stack" beats both ends.
const ROLE_RULES: readonly [Role, RegExp][] = [
  ["security", /secur|pentest|penetration|appsec|infosec|cyber|soc analyst/],
  ["qa", /\bqa\b|quality|\btest|sdet/],
  ["devops", /devops|\bsre\b|site reliability|platform eng|infrastructure|cloud eng/],
  ["product", /product\s*(manager|owner|lead|director)|\bpm\b|\bpo\b/],
  ["data", /\bdata\b|machine learning|\bml\b|\bai\b|analytics|\bbi\b/],
  ["mobile", /mobile|\bios\b|android|react native|flutter/],
  ["fullstack", /full\s*-?\s*stack/],
  ["frontend", /front\s*-?\s*end|\bui (engineer|developer)|react|angular|vue/],
  ["backend", /back\s*-?\s*end|server|\bapi\b|java\b|golang|\.net|node/],
];

/** Role family for a job title or role name. */
export function normalizeRole(title: string): Role {
  const text = title.toLowerCase();
  return ROLE_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "other";
}

const SENIORITY_RULES: readonly [Seniority, RegExp][] = [
  ["principal", /principal|\bstaff\b|distinguished|architect/],
  ["lead", /\blead\b|head of|engineering manager|director|\bvp\b/],
  ["senior", /senior|\bsr\b/],
  ["junior", /junior|\bjr\b|intern|trainee|graduate|entry/],
  ["mid", /\bmid\b|middle|intermediate/],
];

/** Seniority from a job title; falls back to total years when the title says nothing. */
export function normalizeSeniority(title: string, yearsTotal?: number): Seniority {
  const text = title.toLowerCase();
  const match = SENIORITY_RULES.find(([, pattern]) => pattern.test(text));
  if (match) return match[0];
  if (yearsTotal === undefined) return "mid";
  if (yearsTotal < 2) return "junior";
  if (yearsTotal < 5) return "mid";
  return "senior";
}

/** Canonical names, duplicates merged keeping the most years. Order of first appearance is kept. */
export function normalizeSkills(skills: readonly Skill[]): Skill[] {
  const merged = new Map<string, Skill>();
  for (const skill of skills) {
    const name = normalizeSkill(skill.name);
    const key = aliasKey(name);
    const previous = merged.get(key);
    const years =
      previous?.years === undefined ? skill.years : Math.max(previous.years, skill.years ?? 0);
    merged.set(key, years === undefined ? { name } : { name, years });
  }
  return [...merged.values()];
}

const LEVEL_RANK = new Map<LanguageLevel, number>(LANGUAGE_LEVELS.map((level, i) => [level, i]));

/** Canonical names, duplicates merged keeping the highest level. */
export function normalizeLanguages(languages: readonly Language[]): Language[] {
  const merged = new Map<string, Language>();
  for (const entry of languages) {
    const language = normalizeLanguage(entry.language);
    const key = aliasKey(language);
    const previous = merged.get(key);
    const level =
      previous && (LEVEL_RANK.get(previous.level) ?? 0) > (LEVEL_RANK.get(entry.level) ?? 0)
        ? previous.level
        : entry.level;
    merged.set(key, { language, level });
  }
  return [...merged.values()];
}

/** Applies every normalisation to an extracted profile. */
export function normalizeProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    role: profile.role === "other" ? normalizeRole(profile.headline) : profile.role,
    skills: normalizeSkills(profile.skills),
    languages: normalizeLanguages(profile.languages),
    certifications: [...new Set(profile.certifications.map(tidy))],
  };
}
