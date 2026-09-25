import { describe, expect, it } from "vitest";
import { parseDesignFrontMatter, parseThemeTokens } from "../designTokens.mjs";

describe("parseThemeTokens", () => {
  it("reads every namespace from every @theme block and skips the palette reset", () => {
    const css = [
      "@theme { --color-*: initial; }",
      "@theme {",
      "  --color-surface: #fcfcfc;",
      "  --text-body-md: 1rem;",
      "  --font-body-md: \"Google Sans\";",
      "  --font-weight-body-md: 400;",
      "  --radius-md: 0.75rem;",
      "}",
      ":root { --not-a-token: 1; @variant dark { --color-surface: #111; } }",
      "@theme inline { --font-sans: var(--font-google-sans); }",
    ].join("\n");
    const tokens = parseThemeTokens(css);
    expect([...tokens.get("color")!]).toEqual(["surface"]);
    expect([...tokens.get("text")!]).toEqual(["body-md"]);
    expect([...tokens.get("font")!]).toEqual(["body-md", "sans"]);
    expect([...tokens.get("font-weight")!]).toEqual(["body-md"]);
    expect([...tokens.get("radius")!]).toEqual(["md"]);
    expect(tokens.get("shadow")!.size).toBe(0);
  });
});

describe("parseDesignFrontMatter", () => {
  it("collects the keys of each section, and nothing after the front matter", () => {
    const md = ["---", "name: X", "colors:", "  surface: \"#FCFCFC\"", "  primary: \"#00F8C0\"", "typography:", "  body-md:", "    fontSize: 1rem", "components:", "  button-primary:", "    backgroundColor: \"{colors.primary}\"", "---", "", "## Colors", "", "  not-a-key: 1"].join("\n");
    const sections = parseDesignFrontMatter(md);
    expect([...sections.get("colors")!]).toEqual(["surface", "primary"]);
    expect([...sections.get("typography")!]).toEqual(["body-md"]);
    expect([...sections.get("components")!]).toEqual(["button-primary"]);
    expect(sections.has("name")).toBe(false);
  });
});
