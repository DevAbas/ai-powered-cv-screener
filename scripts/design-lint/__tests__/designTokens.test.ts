import { describe, expect, it } from "vitest";
import { parseComponents, parseThemeTokens } from "../designTokens.mjs";

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

describe("parseComponents", () => {
  it("reads each component token's references, and nothing after the front matter", () => {
    const md = ["---", "# A note", "components:", "  button-primary:", '    backgroundColor: "{color.primary}"', '    typography: "{typography.label-md}"', "  divider:", '    backgroundColor: "{color.outline}"', "---", "  ghost:", '    textColor: "{color.x}"'].join("\n");
    const components = parseComponents(md);
    expect([...components.keys()]).toEqual(["button-primary", "divider"]);
    expect(Object.fromEntries(components.get("button-primary")!)).toEqual({ backgroundColor: "color.primary", typography: "typography.label-md" });
  });

  it("reads any YAML style the export's contract check accepts, and leaves stated values to it", () => {
    const md = ["---", 'components: { button-primary: { backgroundColor: "{color.primary}", textColor: "#ffffff" } } # flow style', "---"].join("\n");
    const components = parseComponents(md);
    expect(Object.fromEntries(components.get("button-primary")!)).toEqual({ backgroundColor: "color.primary" });
  });
});
