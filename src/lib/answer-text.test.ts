import { describe, expect, it } from "vitest";
import type { AnswerView } from "@/contracts/view";
import { ANDREI, ELENA } from "@/lib/retrieval/fixtures";
import { answerAsText, listCaption, profileFacts, skillLabel, statusText, viewLines } from "./answer-text";

const list = (ranked: boolean, skills: string[], rows: number): Extract<AnswerView, { kind: "list" }> => ({
  kind: "list",
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
  it("counts the rows and says their order", () => {
    expect(listCaption(list(false, ["Python"], 16))).toBe("16 candidates · most Python experience first");
    expect(listCaption(list(true, [], 3))).toBe("3 candidates · best fit first");
    expect(listCaption(list(false, [], 2))).toBe("2 candidates");
    expect(listCaption(list(false, ["Python"], 1))).toBeUndefined();
  });

  it("says the exact count when there is one, with or without rows", () => {
    expect(listCaption({ ...list(false, ["Python"], 2), count: { matched: 19, total: 30 } })).toBe("19 of 30 candidates · most Python experience first");
    expect(listCaption({ ...list(false, [], 0), count: { matched: 19, total: 30 } })).toBe("19 of 30 candidates");
    expect(listCaption({ ...list(false, [], 1), count: { matched: 1, total: 30 } })).toBe("1 of 30 candidates");
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
  it("copies the text, then the view as lines with each CV's page", () => {
    expect(answerAsText("Two stand out.", list(false, ["Python"], 2))).toBe(
      "Two stand out.\n\n2 candidates · most Python experience first\n- Candidate 0 — Data Engineer — Python 10 yrs — Leads the data platform (CV p. 1)\n- Candidate 1 — Data Engineer — Python 9 yrs (CV p. 1)",
    );
  });

  it("numbers a ranking, and copies a view-only answer or a state without text", () => {
    expect(viewLines(list(true, [], 2))).toEqual(["2 candidates · best fit first", "1. Candidate 0 — Data Engineer — Leads the data platform (CV p. 1)", "2. Candidate 1 — Data Engineer (CV p. 1)"]);
    expect(answerAsText("", { kind: "status", status: "no-match" })).toBe(statusText("no-match"));
    expect(answerAsText("Hello!")).toBe("Hello!");
  });
});
