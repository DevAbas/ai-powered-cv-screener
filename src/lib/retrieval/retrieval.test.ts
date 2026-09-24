import { describe, expect, it } from "vitest";
import { ANDREI, ELENA, LENA, TEST_INDEX } from "./fixtures";
import { candidateMatchesNameQuery, filterByCandidateName, nameTokens } from "./names";

describe("nameTokens", () => {
  it("lower-cases, drops accents, punctuation and words too short to identify anyone", () => {
    expect(nameTokens("Nikolett Szabó's")).toEqual(["nikolett", "szabo"]);
    expect(nameTokens("Li Wu-Chen")).toEqual(["chen"]);
  });
});

describe("candidateMatchesNameQuery", () => {
  it("matches every word of an explicit name", () => {
    expect(candidateMatchesNameQuery("", "Lena Novak", "Lena")).toBe(true);
    expect(candidateMatchesNameQuery("", "Lena Novak", "Lena Novak")).toBe(true);
    expect(candidateMatchesNameQuery("", "Lena Novak", "Summarize Lena Novak")).toBe(false);
  });

  it("without a name, finds the full name or one of its words in the query", () => {
    expect(candidateMatchesNameQuery("tell me about lena novak", "Lena Novak")).toBe(true);
    expect(candidateMatchesNameQuery("Summarize Lena Novak's profile", "Lena Novak")).toBe(true);
    expect(candidateMatchesNameQuery("a calendar of Lenaissance events", "Lena Novak")).toBe(false);
  });
});

describe("filterByCandidateName", () => {
  const nameOf = (entry: (typeof TEST_INDEX)[number]) => entry.profile.name;

  it("keeps only the CVs the lookup names", () => {
    expect(filterByCandidateName("CV profile of Elena", TEST_INDEX, nameOf, "Elena").map((e) => e.id)).toEqual([ELENA.id]);
  });

  it("keeps everyone who shares the name", () => {
    const twin = { ...ANDREI, id: "andrei-ionescu", profile: { ...ANDREI.profile, name: "Andrei Ionescu" } };
    expect(filterByCandidateName("Andrei", [ANDREI, twin, LENA], nameOf, "Andrei").map((e) => e.id)).toEqual([ANDREI.id, twin.id]);
  });
});
