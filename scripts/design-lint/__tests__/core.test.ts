import { describe, expect, it } from "vitest";
import { isExpected } from "../core";

const palette = new Set(["gray-1", "mint-9"]);

describe("isExpected", () => {
  it("accepts a palette entry no component reads, and summaries", () => {
    expect(isExpected({ severity: "warning", rule: "orphaned-tokens", path: "colors.gray-1", message: "" }, palette)).toBe(true);
    expect(isExpected({ severity: "info", rule: "token-summary", message: "" }, palette)).toBe(true);
  });

  it("keeps an unused role and every contrast finding", () => {
    expect(isExpected({ severity: "warning", rule: "orphaned-tokens", path: "colors.on-surface-subtle", message: "" }, palette)).toBe(false);
    expect(isExpected({ severity: "warning", rule: "contrast-ratio", path: "components.page", message: "" }, palette)).toBe(false);
  });
});
