import { describe, expect, it } from "vitest";
import { ANSWERS } from "@/mocks/answers";
import { findCandidate } from "@/mocks/pool";
import { answerToText } from "./answer-text";

const nameOf = (id: string) => findCandidate(id)?.profile.name ?? id;

describe("answerToText", () => {
  it("numbers ranked candidates and cites pages", () => {
    expect(answerToText(ANSWERS.rank, nameOf).split("\n")).toEqual([
      "Top 3 for a Frontend Lead role, best first.",
      "",
      "1. Jane Doe: Leads a team of 6 frontend engineers; 9 years of React (Jane Doe, p. 1)",
      "2. Aiko Tanaka: Principal UI engineer; owns the design system; mentors 4 (Aiko Tanaka, p. 1)",
      "3. Lena Novak: Senior, 8 years; led the migration to Next.js (Lena Novak, p. 1)",
    ]);
  });

  it("names both sides of a comparison", () => {
    expect(answerToText(ANSWERS.compare, nameOf)).toContain(
      "Backend experience: Ali Hasanov: 6 years; Nigar Mammadova: 4 years",
    );
  });

  it("cites the source of a fact", () => {
    expect(answerToText(ANSWERS.fact, nameOf)).toContain("(Lena Novak, p. 1)");
  });

  it("lists profile sections", () => {
    const text = answerToText(ANSWERS.profile, nameOf);
    expect(text).toContain("Skills:\n- React (9 years)");
  });

  it("keeps only the summary for count without a list and for states", () => {
    expect(answerToText(ANSWERS.countOnly, nameOf)).toBe(ANSWERS.countOnly.summary);
    expect(answerToText(ANSWERS.empty, nameOf)).toBe(ANSWERS.empty.summary);
    expect(answerToText(ANSWERS.outOfScope, nameOf)).toBe(ANSWERS.outOfScope.summary);
  });
});
