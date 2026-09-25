import { describe, expect, it } from "vitest";
import type { AnswerView } from "@/contracts";
import { ANDREI, ELENA } from "@/mocks/sampleIndex";
import { answerAsText, listCaption, profileFacts, skillLabel, statusText, viewLines } from "../answerText";

const list = (ranked: boolean, skills: string[], rows: number, lead = ""): Extract<AnswerView, { kind: "list" }> => ({
  kind: "list",
  lead,
  ranked,
  skills,
  rows: Array.from({ length: rows }, (_, i) => ({
    candidateId: `c-${i}`,
    name: `Candidate ${i}`,
    headline: "Data Engineer",
    skills: skills.map((skill) => ({ skill, years: 10 - i })),
    reason: i === 0 ? "Leads the data platform" : "",
    page: 1,
  })),
});

describe("skillLabel", () => {
  it("says the years, one in the singular, and a dash when the CV gives none", () => {
    expect(skillLabel({ skill: "Python", years: 10 })).toBe("Python 10 yrs");
    expect(skillLabel({ skill: "Go", years: 1 })).toBe("Go 1 yr");
    expect(skillLabel({ skill: "Rust", years: null })).toBe("Rust —");
  });
});

describe("listCaption", () => {
  it("is the app's sentence when there is one, the row count for a ranking, and nothing otherwise", () => {
    expect(listCaption(list(false, ["Python"], 16, "There are 16 candidates with Python experience. Here are their details."))).toBe("There are 16 candidates with Python experience. Here are their details.");
    expect(listCaption(list(true, [], 3))).toBe("3 candidates · best fit first");
    expect(listCaption(list(false, [], 2))).toBeUndefined();
    expect(listCaption(list(true, ["Python"], 1))).toBeUndefined();
  });
});

describe("profileFacts", () => {
  it("puts a profile's facts in words", () => {
    expect(profileFacts.notice(ELENA.profile)).toBe("Immediately");
    expect(profileFacts.notice(ANDREI.profile)).toBe("60 days");
    expect(profileFacts.work(ANDREI.profile)).toBe("On-site, hybrid");
    expect(profileFacts.languages(ELENA.profile)).toBe("Greek (native) · English (B2)");
    expect(profileFacts.skills(ANDREI.profile)).toBe("Python 8 yrs · PostgreSQL 6 yrs · Go 4 yrs");
  });
});

describe("answerAsText", () => {
  it("copies the text, then the view as lines led by the app's sentence, with each CV's page", () => {
    expect(answerAsText("Two stand out.", list(false, ["Python"], 2, "There are 2 candidates with Python experience."))).toBe(
      "Two stand out.\n\nThere are 2 candidates with Python experience.\n- Candidate 0 — Data Engineer — Python 10 yrs — Leads the data platform (CV p. 1)\n- Candidate 1 — Data Engineer — Python 9 yrs (CV p. 1)",
    );
  });

  it("opens a profile with the app's sentence when the model wrote none, then its line", () => {
    const view = { kind: "profile" as const, candidate: { candidateId: ANDREI.id, profile: ANDREI.profile, skills: [], page: 1 }, lead: "There is 1 candidate in a backend role. Here is their CV." };
    expect(answerAsText("", view)).toBe(`There is 1 candidate in a backend role. Here is their CV.\n\nAndrei Popescu — ${profileFacts.summary(ANDREI.profile)} (CV p. 1)`);
    expect(answerAsText("Andrei leads the backend.", view)).toBe(`Andrei leads the backend.\n\nAndrei Popescu — ${profileFacts.summary(ANDREI.profile)} (CV p. 1)`);
  });

  it("numbers a ranking, and copies a view-only answer or a state without text", () => {
    expect(viewLines(list(true, [], 2))).toEqual(["2 candidates · best fit first", "1. Candidate 0 — Data Engineer — Leads the data platform (CV p. 1)", "2. Candidate 1 — Data Engineer (CV p. 1)"]);
    expect(answerAsText("", { kind: "status", status: "no-match", lead: "" })).toBe(statusText("no-match"));
    expect(answerAsText("Try Go?", { kind: "status", status: "no-match", lead: "There are no candidates with Rust experience." })).toBe("Try Go?\n\nThere are no candidates with Rust experience.");
    expect(answerAsText("Hello!")).toBe("Hello!");
  });
});
