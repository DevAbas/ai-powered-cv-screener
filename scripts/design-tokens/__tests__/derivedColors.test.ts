import { describe, expect, it } from "vitest";
import { derivedHex, derivedRuleOf, describeRule } from "../derivedColors";

describe("derivedRuleOf", () => {
  it("reads the rule a token carries under its extension key", () => {
    expect(derivedRuleOf({ "cv-screener": { derived: { kind: "lightness", from: "primary", lightness: -0.07 } } })).toEqual({ kind: "lightness", from: "primary", lightness: -0.07 });
    expect(derivedRuleOf(undefined)).toBeUndefined();
    expect(derivedRuleOf({ "other.tool": {} })).toBeUndefined();
  });

  it("refuses a malformed rule", () => {
    expect(() => derivedRuleOf({ "cv-screener": { derived: { kind: "lightness", from: "primary" } } })).toThrow();
  });
});

describe("derivedHex", () => {
  const light: Record<string, string> = { primary: "#00f3bb", "surface-container-low": "#f5f5f5", surface: "#fcfcfc" };

  it("moves OKLCH lightness, keeping hue and chroma, as CSS relative colour does", () => {
    expect(derivedHex({ kind: "lightness", from: "primary", lightness: -0.07 }, (role) => light[role])).toBe("#00daa6");
    expect(derivedHex({ kind: "lightness", from: "primary", lightness: -0.14 }, (role) => light[role])).toBe("#00c192");
  });

  it("mixes in sRGB, which is the role at that opacity over the other", () => {
    expect(derivedHex({ kind: "mix", from: "surface-container-low", weight: 0.6, over: "surface" }, (role) => light[role])).toBe("#f8f8f8");
  });

  it("says the rule in words", () => {
    expect(describeRule({ kind: "mix", from: "on-surface-variant", weight: 0.7, over: "surface" })).toBe("on-surface-variant at 70% over surface");
  });
});
