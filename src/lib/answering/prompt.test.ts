import { describe, expect, it } from "vitest";
import { ANDREI, LENA, TEST_INDEX } from "@/lib/retrieval/fixtures";
import { buildInstructions, buildMessages, candidateDirectory, poolFacts } from "./prompt";

describe("prompt", () => {
  it("states the pool by role", () => {
    expect(poolFacts(TEST_INDEX)).toBe("3 CVs: 2 backend, 1 frontend");
  });

  it("lists every candidate with id, name and headline, and marks a shared name", () => {
    const twin = { ...ANDREI, id: "andrei-ionescu", profile: { ...ANDREI.profile, name: "Andrei Popescu" } };
    const directory = candidateDirectory([ANDREI, twin, LENA]);
    expect(directory).toContain("lena-novak — Lena Novak — Senior Frontend Engineer");
    expect(directory.match(/another candidate has this name/g)).toHaveLength(2);
  });

  it("carries the tone, the tool rules and the previous answer's scope, and no CV text", () => {
    const text = buildInstructions(TEST_INDEX, ["lena-novak"]);
    expect(text).toContain("Plain, warm and brief");
    expect(text).toContain("count_candidates for how many (the only source of a count)");
    expect(text).toContain("The previous answer showed 1 candidate(s): lena-novak");
    expect(text).toContain("ending with a question mark");
    expect(text).not.toContain("Kinetix Digital");
    expect(buildInstructions(TEST_INDEX, [])).toContain("There is no previous answer to narrow.");
  });

  it("sends the whole conversation as chat turns, then the question", () => {
    expect(buildMessages([{ question: "Who has React?", answer: "**Lena Novak**.", candidateIds: ["lena-novak"] }, { question: "hi", answer: "", candidateIds: [] }], "Is she senior?")).toEqual([
      { role: "user", content: "Who has React?" },
      { role: "assistant", content: "**Lena Novak**." },
      { role: "user", content: "hi" },
      { role: "user", content: "Is she senior?" },
    ]);
  });
});
