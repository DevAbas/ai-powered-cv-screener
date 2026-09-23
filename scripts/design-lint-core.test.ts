import { describe, expect, it } from "vitest";
import { checkCoverage, parseDarkColors, withDarkColors } from "./design-lint-core";

const THEME = `
:root {
  color-scheme: light;
  @variant dark {
    color-scheme: dark;
    --color-surface: #111111;
    --color-on-surface: #eeeeee;
  }
}
@theme { --color-ignored: #123456; }
`;

const DESIGN = `---
name: Test
colors:
  surface: "#FCFCFC"
  on-surface: "#202020"
  primary: "#B5591C"
components:
  page:
    backgroundColor: "{colors.surface}"
---

# Test

  surface: "#FCFCFC"
`;

describe("parseDarkColors", () => {
  it("reads only the colour roles inside the dark variant", () => {
    expect(parseDarkColors(THEME)).toEqual(
      new Map([
        ["surface", "#111111"],
        ["on-surface", "#EEEEEE"],
      ]),
    );
  });

  it("returns an empty map when there is no dark variant", () => {
    expect(parseDarkColors("@theme { --color-surface: #fff; }").size).toBe(0);
  });
});

describe("checkCoverage", () => {
  it("reports missing and unknown dark roles", () => {
    const issues = checkCoverage(["surface", "primary"], new Map([["surface", "#111111"], ["extra", "#000000"]]));
    expect(issues.map((i) => i.message)).toEqual([
      "Dark theme has no value for colors.primary",
      "Dark value --color-extra has no colour role in DESIGN.md",
    ]);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("passes when both sides match", () => {
    expect(checkCoverage(["surface"], new Map([["surface", "#111111"]]))).toEqual([]);
  });
});

describe("withDarkColors", () => {
  it("replaces front-matter colour values only", () => {
    const out = withDarkColors(DESIGN, parseDarkColors(THEME));
    expect(out).toContain('  surface: "#111111"');
    expect(out).toContain('  on-surface: "#EEEEEE"');
    expect(out).toContain('  primary: "#B5591C"');
    expect(out).toContain('backgroundColor: "{colors.surface}"');
    // The body after the front matter is untouched.
    expect(out.endsWith('  surface: "#FCFCFC"\n')).toBe(true);
  });
});
