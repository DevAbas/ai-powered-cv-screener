import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANSWER_MODEL_IDS } from "@/contracts/ask";
import { answerEntries, answerEntry, getEntry, recommendedEntry, REGISTRY } from "./registry";

describe("answer models", () => {
  it("offers only enabled entries, each with its maker's logo for the menu", () => {
    for (const entry of answerEntries()) {
      expect(entry.enabled).toBe(true);
      expect(entry.capabilities.tools, entry.id).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", "icons", "providers", `${entry.vendor}.svg`)), entry.id).toBe(true);
    }
  });

  it("preselects exactly one", () => {
    expect(answerEntries().filter((entry) => entry.recommended)).toEqual([recommendedEntry()]);
  });

  it("pins free OpenRouter models, never the router, with a fallback from another vendor", () => {
    for (const id of ANSWER_MODEL_IDS) {
      const entry = getEntry(id);
      expect(entry.provider).toBe("openrouter");
      expect(entry.model).toMatch(/:free$/);
      expect(entry.model).not.toBe("openrouter/free");
      if (entry.fallback) expect(entry.fallback.vendor).not.toBe(entry.vendor);
    }
  });

  it("keeps the Gemini answer entries disabled and out of the menu", () => {
    expect(REGISTRY["gemini-flash-lite"].enabled).toBe(false);
    expect(REGISTRY["gemini-flash"].enabled).toBe(false);
    expect(answerEntries().every((entry) => entry.vendor !== "google")).toBe(true);
    expect(answerEntry("primary")?.id).toBe("primary");
  });

  it("runs the scripts on the primary's model with structured outputs", () => {
    for (const id of ["extract", "generate"] as const) {
      expect(getEntry(id).model).toBe(getEntry("primary").model);
      expect(getEntry(id).capabilities.structuredOutput).toBe(true);
    }
  });
});
