import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { answerEntries, recommendedEntry } from "./registry";

describe("answer models", () => {
  it("each has its maker's logo for the menu", () => {
    for (const entry of answerEntries()) {
      expect(existsSync(path.join(process.cwd(), "public", "icons", "providers", `${entry.vendor}.svg`)), entry.id).toBe(true);
    }
  });

  it("preselects exactly one", () => {
    expect(answerEntries().filter((entry) => entry.recommended)).toEqual([recommendedEntry()]);
  });
});
