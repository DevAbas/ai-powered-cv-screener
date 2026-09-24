import type { PoolCandidate } from "@/lib/pool/candidate";

// Mock pool for component previews and tests: the 30 candidates of the
// generator's roster (`scripts/generate/roster.ts`, kept equal by its test),
// with the page count of each generated PDF (`data/pdfs.json`). The app reads
// the pool from the index.

export const MOCK_POOL: readonly PoolCandidate[] = [
  { id: "lena-novak", pages: 1, profile: { name: "Lena Novak", headline: "Senior Frontend Engineer", role: "frontend", seniority: "senior", location: "Berlin, Germany" } },
  { id: "jane-doe", pages: 2, profile: { name: "Jane Doe", headline: "Frontend Lead", role: "frontend", seniority: "lead", location: "Dublin, Ireland" } },
  { id: "marco-bianchi", pages: 2, profile: { name: "Marco Bianchi", headline: "Frontend Engineer", role: "frontend", seniority: "mid", location: "Milan, Italy" } },
  { id: "sofia-almeida", pages: 2, profile: { name: "Sofia Almeida", headline: "Senior Frontend Developer", role: "frontend", seniority: "senior", location: "Lisbon, Portugal" } },
  { id: "tomasz-kowalski", pages: 1, profile: { name: "Tomasz Kowalski", headline: "Junior Frontend Developer", role: "frontend", seniority: "junior", location: "Warsaw, Poland" } },
  { id: "daan-de-vries", pages: 3, profile: { name: "Daan de Vries", headline: "Principal UI Engineer", role: "frontend", seniority: "principal", location: "Amsterdam, Netherlands" } },
  { id: "andrei-popescu", pages: 2, profile: { name: "Andrei Popescu", headline: "Senior Backend Engineer", role: "backend", seniority: "senior", location: "Bucharest, Romania" } },
  { id: "elena-georgiou", pages: 2, profile: { name: "Elena Georgiou", headline: "Backend Engineer", role: "backend", seniority: "mid", location: "Athens, Greece" } },
  { id: "petra-horvat", pages: 3, profile: { name: "Petra Horvat", headline: "Backend Lead", role: "backend", seniority: "lead", location: "Zagreb, Croatia" } },
  { id: "emma-larsen", pages: 2, profile: { name: "Emma Larsen", headline: "Senior Backend Developer", role: "backend", seniority: "senior", location: "Copenhagen, Denmark" } },
  { id: "kristaps-ozols", pages: 2, profile: { name: "Kristaps Ozols", headline: "Backend Engineer", role: "backend", seniority: "mid", location: "Riga, Latvia" } },
  { id: "domas-petrauskas", pages: 1, profile: { name: "Domas Petrauskas", headline: "Junior Backend Developer", role: "backend", seniority: "junior", location: "Vilnius, Lithuania" } },
  { id: "lucas-martin", pages: 2, profile: { name: "Lucas Martin", headline: "Senior Data Engineer", role: "data", seniority: "senior", location: "Paris, France" } },
  { id: "nikolett-szabo", pages: 2, profile: { name: "Nikolett Szabó", headline: "Data Scientist", role: "data", seniority: "mid", location: "Budapest, Hungary" } },
  { id: "jonas-weber", pages: 3, profile: { name: "Jonas Weber", headline: "Lead Data Engineer", role: "data", seniority: "lead", location: "Munich, Germany" } },
  { id: "ines-garcia", pages: 2, profile: { name: "Inés García", headline: "Machine Learning Engineer", role: "data", seniority: "senior", location: "Barcelona, Spain" } },
  { id: "andrej-zupan", pages: 2, profile: { name: "Andrej Zupan", headline: "Senior DevOps Engineer", role: "devops", seniority: "senior", location: "Ljubljana, Slovenia" } },
  { id: "aino-virtanen", pages: 2, profile: { name: "Aino Virtanen", headline: "Site Reliability Engineer", role: "devops", seniority: "mid", location: "Helsinki, Finland" } },
  { id: "pablo-ruiz", pages: 2, profile: { name: "Pablo Ruiz", headline: "DevOps Lead", role: "devops", seniority: "lead", location: "Madrid, Spain" } },
  { id: "anna-schmidt", pages: 2, profile: { name: "Anna Schmidt", headline: "Platform Engineer", role: "devops", seniority: "mid", location: "Vienna, Austria" } },
  { id: "rasmus-tamm", pages: 2, profile: { name: "Rasmus Tamm", headline: "Senior QA Engineer", role: "qa", seniority: "senior", location: "Tallinn, Estonia" } },
  { id: "chloe-dubois", pages: 2, profile: { name: "Chloé Dubois", headline: "QA Automation Engineer", role: "qa", seniority: "mid", location: "Lyon, France" } },
  { id: "bram-peeters", pages: 2, profile: { name: "Bram Peeters", headline: "QA Lead", role: "qa", seniority: "lead", location: "Antwerp, Belgium" } },
  { id: "hana-novotna", pages: 1, profile: { name: "Hana Novotná", headline: "Junior QA Engineer", role: "qa", seniority: "junior", location: "Prague, Czechia" } },
  { id: "sara-lindqvist", pages: 2, profile: { name: "Sara Lindqvist", headline: "Senior Product Manager", role: "product", seniority: "senior", location: "Stockholm, Sweden" } },
  { id: "luca-borg", pages: 2, profile: { name: "Luca Borg", headline: "Product Owner", role: "product", seniority: "mid", location: "Valletta, Malta" } },
  { id: "maria-ioannou", pages: 3, profile: { name: "Maria Ioannou", headline: "Head of Product", role: "product", seniority: "principal", location: "Nicosia, Cyprus" } },
  { id: "leon-fischer", pages: 2, profile: { name: "Leon Fischer", headline: "Senior Full-Stack Engineer", role: "fullstack", seniority: "senior", location: "Luxembourg, Luxembourg" } },
  { id: "zuzana-holubova", pages: 2, profile: { name: "Zuzana Holubová", headline: "Mobile Engineer", role: "mobile", seniority: "mid", location: "Bratislava, Slovakia" } },
  { id: "viktor-ivanov", pages: 2, profile: { name: "Viktor Ivanov", headline: "Application Security Engineer", role: "security", seniority: "senior", location: "Sofia, Bulgaria" } },
];

export function findCandidate(id: string): PoolCandidate | undefined {
  return MOCK_POOL.find((c) => c.id === id);
}
