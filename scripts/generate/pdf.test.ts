import { describe, expect, it } from "vitest";
import { countPdfPages, formatAvailability, formatDegree, formatMonth, formatMonthNumeric, formatWorkModes } from "./pdf";

describe("countPdfPages", () => {
  it("counts page objects, not the page tree", () => {
    const pdf = Buffer.from("1 0 obj << /Type /Pages /Kids [2 0 R 3 0 R] >> 2 0 obj << /Type /Page >> 3 0 obj <</Type/Page>>");
    expect(countPdfPages(pdf)).toBe(2);
  });
});

describe("formatting", () => {
  it("formats months, degrees, availability and work modes", () => {
    expect(formatMonth("2021-04")).toBe("Apr 2021");
    expect(formatMonth(null)).toBe("Present");
    expect(formatMonthNumeric("2019-07")).toBe("07/2019");
    expect(formatMonthNumeric(null)).toBe("Present");
    expect(formatDegree("bachelor", "Computer Science")).toBe("BSc Computer Science");
    expect(formatDegree("doctorate", "Physics")).toBe("PhD in Physics");
    expect(formatAvailability(0)).toBe("Available immediately");
    expect(formatAvailability(30)).toBe("Notice period: 30 days");
    expect(formatWorkModes(["hybrid", "relocation"])).toBe("Hybrid · Open to relocation");
  });
});
