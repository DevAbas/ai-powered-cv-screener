import { describe, expect, it } from "vitest";
import { LENA } from "@/mocks/sampleIndex";
import { pageTexts, sectionPages } from "../cvChunks";

describe("chunks", () => {
  it("rebuilds page texts from the chunks", () => {
    expect(pageTexts(LENA)).toHaveLength(2);
    expect(pageTexts(LENA)[0]).toContain("SKILLS\nReact (7 years)");
  });

  it("lists the pages each section falls on", () => {
    expect(sectionPages(LENA)).toMatchObject({ header: [1], skills: [1], experience: [2], languages: [2] });
  });
});
