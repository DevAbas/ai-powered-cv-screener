import { describe, expect, it } from "vitest";
import { headingOf, splitSections } from "../cvSections";

const PAGE_1 = ["Lena Novak", "Senior Frontend Engineer", "SUMMARY", "Seven years of frontend work.", "SKILLS", "React (7 years) · TypeScript (6 years)", "EXPERIENCE", "Senior Frontend Engineer — Kinetix Digital Mar 2022 – Present"].join("\n");
const PAGE_2 = ["Frontend Engineer — Old Shop Jan 2018 – Feb 2022", "LANGUAGES", "German (native) · English (C1)", "CERTIFICATIONS"].join("\n");
const PAGE_3 = "AWS Certified Developer - Associate";

describe("headingOf", () => {
  it("recognises the contract's section names, case aside, and nothing else", () => {
    expect(headingOf("SKILLS")).toBe("skills");
    expect(headingOf("  Languages ")).toBe("languages");
    expect(headingOf("HEADER")).toBeUndefined();
    expect(headingOf("Skills and tools")).toBeUndefined();
    expect(headingOf("React")).toBeUndefined();
  });
});

describe("splitSections", () => {
  const chunks = splitSections("lena-novak", [PAGE_1, PAGE_2, PAGE_3]);

  it("starts with the header, one chunk per section and page, continuing a section across pages", () => {
    expect(chunks.map((chunk) => chunk.id)).toEqual([
      "lena-novak:header:1",
      "lena-novak:summary:1",
      "lena-novak:skills:1",
      "lena-novak:experience:1",
      "lena-novak:experience:2",
      "lena-novak:languages:2",
      "lena-novak:certifications:3",
    ]);
  });

  it("keeps the heading with its text and leaves a heading alone at a page's foot out", () => {
    expect(chunks[2].text).toBe("SKILLS\nReact (7 years) · TypeScript (6 years)");
    expect(chunks[4].text).toBe("Frontend Engineer — Old Shop Jan 2018 – Feb 2022");
    expect(chunks.find((chunk) => chunk.section === "certifications")?.page).toBe(3);
  });

  it("gives a CV without known headings one other chunk per page, and an empty page none", () => {
    expect(splitSections("x", ["Some text", "", "More text"]).map((chunk) => chunk.id)).toEqual(["x:header:1", "x:other:3"]);
  });
});
