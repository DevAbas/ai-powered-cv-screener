import type { PoolCandidate } from "@/lib/pool/candidate";

// Mock pool for the UI phase: 30 synthetic CVs with the role mix in PLAN,
// Generation pipeline. Replaced by the index in the API phase.

export const MOCK_POOL: readonly PoolCandidate[] = [
  { id: "lena-novak", pages: 2, profile: { name: "Lena Novak", headline: "Senior Frontend Engineer", role: "frontend", seniority: "senior", location: "Berlin, Germany" } },
  { id: "jane-doe", pages: 3, profile: { name: "Jane Doe", headline: "Frontend Lead", role: "frontend", seniority: "lead", location: "London, United Kingdom" } },
  { id: "marco-bianchi", pages: 2, profile: { name: "Marco Bianchi", headline: "Frontend Engineer", role: "frontend", seniority: "mid", location: "Milan, Italy" } },
  { id: "sofia-almeida", pages: 2, profile: { name: "Sofia Almeida", headline: "Senior Frontend Developer", role: "frontend", seniority: "senior", location: "Lisbon, Portugal" } },
  { id: "tomasz-kowalski", pages: 1, profile: { name: "Tomasz Kowalski", headline: "Junior Frontend Developer", role: "frontend", seniority: "junior", location: "Warsaw, Poland" } },
  { id: "aiko-tanaka", pages: 3, profile: { name: "Aiko Tanaka", headline: "Principal UI Engineer", role: "frontend", seniority: "principal", location: "Amsterdam, Netherlands" } },
  { id: "ali-hasanov", pages: 2, profile: { name: "Ali Hasanov", headline: "Senior Backend Engineer", role: "backend", seniority: "senior", location: "Baku, Azerbaijan" } },
  { id: "nigar-mammadova", pages: 2, profile: { name: "Nigar Mammadova", headline: "Backend Engineer", role: "backend", seniority: "mid", location: "Baku, Azerbaijan" } },
  { id: "david-cohen", pages: 3, profile: { name: "David Cohen", headline: "Backend Lead", role: "backend", seniority: "lead", location: "Tel Aviv, Israel" } },
  { id: "emma-larsen", pages: 2, profile: { name: "Emma Larsen", headline: "Senior Backend Developer", role: "backend", seniority: "senior", location: "Copenhagen, Denmark" } },
  { id: "rahul-mehta", pages: 2, profile: { name: "Rahul Mehta", headline: "Backend Engineer", role: "backend", seniority: "mid", location: "Bengaluru, India" } },
  { id: "olga-petrova", pages: 1, profile: { name: "Olga Petrova", headline: "Junior Backend Developer", role: "backend", seniority: "junior", location: "Tbilisi, Georgia" } },
  { id: "lucas-martin", pages: 2, profile: { name: "Lucas Martin", headline: "Senior Data Engineer", role: "data", seniority: "senior", location: "Paris, France" } },
  { id: "fatima-zahra", pages: 2, profile: { name: "Fatima Zahra", headline: "Data Scientist", role: "data", seniority: "mid", location: "Casablanca, Morocco" } },
  { id: "jonas-weber", pages: 3, profile: { name: "Jonas Weber", headline: "Lead Data Engineer", role: "data", seniority: "lead", location: "Munich, Germany" } },
  { id: "mei-lin", pages: 2, profile: { name: "Mei Lin", headline: "Machine Learning Engineer", role: "data", seniority: "senior", location: "Singapore" } },
  { id: "kofi-mensah", pages: 2, profile: { name: "Kofi Mensah", headline: "Senior DevOps Engineer", role: "devops", seniority: "senior", location: "Accra, Ghana" } },
  { id: "ingrid-berg", pages: 2, profile: { name: "Ingrid Berg", headline: "Site Reliability Engineer", role: "devops", seniority: "mid", location: "Oslo, Norway" } },
  { id: "pablo-ruiz", pages: 2, profile: { name: "Pablo Ruiz", headline: "DevOps Lead", role: "devops", seniority: "lead", location: "Madrid, Spain" } },
  { id: "anna-schmidt", pages: 2, profile: { name: "Anna Schmidt", headline: "Platform Engineer", role: "devops", seniority: "mid", location: "Vienna, Austria" } },
  { id: "yusuf-demir", pages: 2, profile: { name: "Yusuf Demir", headline: "Senior QA Engineer", role: "qa", seniority: "senior", location: "Istanbul, Türkiye" } },
  { id: "chloe-dubois", pages: 2, profile: { name: "Chloé Dubois", headline: "QA Automation Engineer", role: "qa", seniority: "mid", location: "Lyon, France" } },
  { id: "mateo-silva", pages: 2, profile: { name: "Mateo Silva", headline: "QA Lead", role: "qa", seniority: "lead", location: "São Paulo, Brazil" } },
  { id: "hana-novotna", pages: 1, profile: { name: "Hana Novotná", headline: "Junior QA Engineer", role: "qa", seniority: "junior", location: "Prague, Czechia" } },
  { id: "sara-lindqvist", pages: 2, profile: { name: "Sara Lindqvist", headline: "Senior Product Manager", role: "product", seniority: "senior", location: "Stockholm, Sweden" } },
  { id: "omar-haddad", pages: 2, profile: { name: "Omar Haddad", headline: "Product Owner", role: "product", seniority: "mid", location: "Dubai, United Arab Emirates" } },
  { id: "grace-okafor", pages: 3, profile: { name: "Grace Okafor", headline: "Head of Product", role: "product", seniority: "principal", location: "Lagos, Nigeria" } },
  { id: "leon-fischer", pages: 2, profile: { name: "Leon Fischer", headline: "Senior Full-Stack Engineer", role: "fullstack", seniority: "senior", location: "Zurich, Switzerland" } },
  { id: "maya-levi", pages: 2, profile: { name: "Maya Levi", headline: "Mobile Engineer", role: "mobile", seniority: "mid", location: "Haifa, Israel" } },
  { id: "viktor-ivanov", pages: 2, profile: { name: "Viktor Ivanov", headline: "Application Security Engineer", role: "security", seniority: "senior", location: "Sofia, Bulgaria" } },
];

export function findCandidate(id: string): PoolCandidate | undefined {
  return MOCK_POOL.find((c) => c.id === id);
}
