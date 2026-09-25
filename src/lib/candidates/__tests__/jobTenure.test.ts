import { describe, expect, it } from "vitest";
import type { Employment } from "@/contracts";
import { medianTenureMonths, yearMonthOf } from "../jobTenure";

const job = (from: string, to: string | null): Employment => ({ company: "Acme", title: "Engineer", industry: "Retail", from, to });

describe("medianTenureMonths", () => {
  it("counts both end months and runs a current job to now", () => {
    expect(medianTenureMonths([job("2024-01", "2024-12")], "2026-09")).toBe(12);
    expect(medianTenureMonths([job("2026-01", null)], "2026-09")).toBe(9);
  });

  it("takes the median, averaging the middle two", () => {
    expect(medianTenureMonths([job("2020-01", "2020-06"), job("2021-01", "2021-12"), job("2022-01", "2023-12")], "2026-09")).toBe(12);
    expect(medianTenureMonths([job("2020-01", "2020-06"), job("2021-01", "2021-12")], "2026-09")).toBe(9);
  });

  it("is null without jobs", () => {
    expect(medianTenureMonths([], "2026-09")).toBeNull();
  });
});

describe("yearMonthOf", () => {
  it("formats a date as YYYY-MM in UTC", () => {
    expect(yearMonthOf(new Date(Date.UTC(2026, 8, 24)))).toBe("2026-09");
  });
});
