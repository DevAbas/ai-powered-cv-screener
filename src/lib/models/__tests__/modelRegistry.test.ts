import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { answerEntries, answerEntry, getEntry, recommendedEntry, REGISTRY } from "../modelRegistry";

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

  it("offers one model in this phase, Gemini Flash-Lite pinned to a release, with no fallback", () => {
    expect(answerEntries().map((entry) => entry.id)).toEqual(["primary"]);
    const primary = getEntry("primary");
    expect(primary.provider).toBe("google");
    expect(primary.model).not.toMatch(/latest|preview/);
    expect(primary.fallback).toBeUndefined();
  });

  it("keeps the OpenRouter entries and Gemini 3.6 Flash disabled and out of the menu", () => {
    const alternative = REGISTRY.alternative;
    expect(alternative.enabled).toBe(false);
    expect(alternative.provider).toBe("openrouter");
    expect(alternative.model).not.toMatch(/:free$/);
    expect(alternative.model).not.toBe("openrouter/free");
    expect(alternative.fallback?.vendor).not.toBe(alternative.vendor);
    expect(REGISTRY["gemini-flash"].enabled).toBe(false);
    expect(answerEntry("alternative")).toBeUndefined();
    expect(answerEntry("primary")?.id).toBe("primary");
  });

  it("runs the scripts on the primary's model with structured outputs", () => {
    for (const id of ["extract", "generate"] as const) {
      expect(getEntry(id).model).toBe(getEntry("primary").model);
      expect(getEntry(id).capabilities.structuredOutput).toBe(true);
    }
  });
});
