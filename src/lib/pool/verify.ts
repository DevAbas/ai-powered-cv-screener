import type { CandidateProfile, Chunk, FieldSource, SectionName } from "@/contracts/candidate";

// Checking an extracted profile against the CV's text (PLAN, Indexer):
// every field is located in its own section, so its source page is known
// and the CV's spelling is kept. A value is located when its characters
// appear as a run of whole words of the text, case, accents, punctuation
// and spacing aside: "HTML/CSS" in "HTML / CSS", "onsite" in "On-site",
// never a word inside another word.

interface Token {
  text: string;
  start: number;
  end: number;
}

const WORD = /[\p{L}\p{N}]+/gu;

/** Case and accents folded: Unicode compatibility decomposition with the combining marks dropped. */
const fold = (word: string) => word.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

function tokens(text: string): Token[] {
  return [...text.matchAll(WORD)].map((match) => ({ text: fold(match[0]), start: match.index, end: match.index + match[0].length }));
}

const joined = (value: string) => tokens(value).map((token) => token.text).join("");

/** The value's first occurrence in `text`, as the text writes it. */
export function locate(value: string, text: string): string | undefined {
  const target = joined(value);
  if (!target) return undefined;
  const words = tokens(text);
  for (let i = 0; i < words.length; i++) {
    let run = "";
    for (let j = i; j < words.length && run.length < target.length; j++) {
      run += words[j].text;
      if (run === target) return text.slice(words[i].start, words[j].end);
    }
  }
  return undefined;
}

export interface Located {
  chunk: Chunk;
  /** The value as the CV writes it. */
  text: string;
}

/** The first chunk that holds the value, in the given sections first, then anywhere. */
export function locateIn(value: string, chunks: readonly Chunk[], sections: readonly SectionName[]): Located | undefined {
  const ordered = [...chunks.filter((chunk) => sections.includes(chunk.section)), ...chunks.filter((chunk) => !sections.includes(chunk.section))];
  for (const chunk of ordered) {
    const text = locate(value, chunk.text);
    if (text !== undefined) return { chunk, text };
  }
  return undefined;
}

/** What the extraction copied from the CV, as printed, so numbers, levels and dates can be checked against it. */
export interface ExtractionEvidence {
  availabilityAsWritten?: string;
  yearsTotalAsWritten?: string;
  /** Per skill, e.g. "React (7 years)". */
  skills?: readonly (string | undefined)[];
  /** Per language, e.g. "English (C1)". */
  languages?: readonly (string | undefined)[];
  /** Per education entry, e.g. "MSc Artificial Intelligence 2018". */
  education?: readonly (string | undefined)[];
  /** Per job, the period as printed, e.g. "Jun 2021 – Present". */
  employment?: readonly (string | undefined)[];
}

export interface Verified {
  profile: CandidateProfile;
  sources: Record<string, FieldSource>;
  /** Field paths whose value was not found in the CV's text. */
  unverified: string[];
}

/** True when every whole word of `needle` appears in `haystack` (a number, a level, a year). */
const mentions = (haystack: string, needle: string): boolean => locate(needle, haystack) !== undefined;

export function verifyProfile(profile: CandidateProfile, chunks: readonly Chunk[], evidence: ExtractionEvidence = {}): Verified {
  const sources: Record<string, FieldSource> = {};
  const unverified: string[] = [];
  const firstPage = (sections: readonly SectionName[]) => chunks.find((chunk) => sections.includes(chunk.section))?.page ?? chunks[0]?.page ?? 1;
  const sectionOf = (sections: readonly SectionName[]) => chunks.find((chunk) => sections.includes(chunk.section))?.section ?? sections[0];

  /** Records the field's source; returns the CV's spelling when found. */
  const record = (path: string, value: string | undefined, sections: readonly SectionName[]): string | undefined => {
    const found = value ? locateIn(value, chunks, sections) : undefined;
    if (found) {
      sources[path] = { section: found.chunk.section, page: found.chunk.page, verified: true };
      return found.text;
    }
    sources[path] = { section: sectionOf(sections), page: firstPage(sections), verified: false };
    unverified.push(path);
    return undefined;
  };

  const header: SectionName[] = ["header"];
  const headline = record("headline", profile.headline, header) ?? profile.headline;
  // Role and seniority are read from the headline: they share its source.
  sources.role = sources.headline;
  sources.seniority = sources.headline;
  const location = record("location", profile.location, header) ?? profile.location;
  const workAuthorization = record("workAuthorization", profile.workAuthorization, header) ?? profile.workAuthorization;

  const modes = profile.remote.map((mode) => locateIn(mode, chunks, header));
  const modeChunk = modes.find(Boolean)?.chunk;
  sources.remote = modeChunk && modes.every(Boolean) ? { section: modeChunk.section, page: modeChunk.page, verified: true } : { section: "header", page: firstPage(header), verified: false };
  if (!sources.remote.verified) unverified.push("remote");

  const availabilityText = evidence.availabilityAsWritten ?? (profile.availability > 0 ? String(profile.availability) : undefined);
  const availabilityFound = record("availability", availabilityText, header);
  if (availabilityFound && evidence.availabilityAsWritten && profile.availability > 0 && !mentions(availabilityFound, String(profile.availability))) {
    sources.availability = { ...sources.availability, verified: false };
    unverified.push("availability");
  }

  const yearsSections: SectionName[] = ["summary", "header"];
  const yearsFound = record("yearsTotal", evidence.yearsTotalAsWritten ?? String(profile.yearsTotal), yearsSections);
  if (yearsFound && evidence.yearsTotalAsWritten && !mentions(yearsFound, String(profile.yearsTotal))) {
    sources.yearsTotal = { ...sources.yearsTotal, verified: false };
    unverified.push("yearsTotal");
  }

  const skills = profile.skills.map((skill, i) => {
    const asWritten = evidence.skills?.[i];
    const found = record(`skills.${i}`, asWritten ?? skill.name, ["skills"]);
    const name = (found && locate(skill.name, found)) ?? skill.name;
    // Years the CV does not state next to the skill are no fact.
    if (found && asWritten && skill.years !== undefined && !mentions(found, String(skill.years))) return { name };
    return skill.years === undefined ? { name } : { name, years: skill.years };
  });

  const languages = profile.languages.map((entry, i) => {
    const asWritten = evidence.languages?.[i];
    const found = record(`languages.${i}`, asWritten ?? entry.language, ["languages"]);
    if (found && asWritten && !mentions(found, entry.level)) {
      sources[`languages.${i}`] = { ...sources[`languages.${i}`], verified: false };
      unverified.push(`languages.${i}`);
    }
    return { language: (found && locate(entry.language, found)) ?? entry.language, level: entry.level };
  });

  const education = profile.education.map((entry, i) => {
    const asWritten = evidence.education?.[i];
    const found = record(`education.${i}`, asWritten ?? entry.institution, ["education"]);
    const institution = locateIn(entry.institution, chunks, ["education"])?.text ?? entry.institution;
    const field = locateIn(entry.field, chunks, ["education"])?.text ?? entry.field;
    if (found && asWritten && !mentions(found, String(entry.year))) {
      sources[`education.${i}`] = { ...sources[`education.${i}`], verified: false };
      unverified.push(`education.${i}`);
    }
    return { ...entry, institution, field };
  });

  const employment = profile.employment.map((job, i) => {
    const path = `employment.${i}`;
    const company = record(path, job.company, ["experience"]);
    const title = locateIn(job.title, chunks, ["experience"])?.text;
    const industry = locateIn(job.industry, chunks, ["experience"])?.text;
    const period = evidence.employment?.[i];
    const periodFound = period ? locateIn(period, chunks, ["experience"]) : undefined;
    const years = [job.from.slice(0, 4), ...(job.to ? [job.to.slice(0, 4)] : [])];
    const datesOk = period ? periodFound !== undefined && years.every((year) => mentions(periodFound.text, year)) : true;
    if (sources[path]?.verified && (!title || !datesOk)) {
      sources[path] = { ...sources[path], verified: false };
      unverified.push(path);
    }
    return { ...job, company: company ?? job.company, title: title ?? job.title, industry: industry ?? job.industry };
  });

  const leadershipChunk = chunks.find((chunk) => chunk.section === "leadership");
  let leadership = profile.leadership;
  if (profile.leadership.has) {
    const note = record("leadership", profile.leadership.note, ["leadership"]);
    leadership = { has: true, note: note ?? profile.leadership.note };
  } else {
    sources.leadership = { section: "leadership", page: leadershipChunk?.page ?? firstPage(header), verified: leadershipChunk === undefined };
    if (leadershipChunk) unverified.push("leadership");
  }

  const certifications = profile.certifications.map((value, i) => record(`certifications.${i}`, value, ["certifications"]) ?? value);

  return {
    profile: { ...profile, headline, location, workAuthorization, skills, languages, education, employment, leadership, certifications },
    sources,
    unverified,
  };
}
