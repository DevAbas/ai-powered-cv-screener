import css from "@eslint/css";
import { RuleTester } from "eslint";
import { describe, expect, it } from "vitest";
import { stylesheetColor, stylesheetColorProblems } from "../rules/stylesheetColor.mjs";
import "./ruleTester";

// The stylesheets' own language, as eslint.config.mjs sets it for src/**/*.css.
const cssTester = new RuleTester({ plugins: { css }, language: "css/css", languageOptions: { tolerant: true } });
const STYLESHEET = "src/styles/probe.css";

describe("stylesheetColorProblems", () => {
  it("sees what design/no-raw-color sees, and the palette, but not comments", () => {
    expect(stylesheetColorProblems("color: #202020")).toEqual(["rawColor"]);
    expect(stylesheetColorProblems("background: var(--palette-mint-9)")).toEqual(["paletteVariable"]);
    expect(stylesheetColorProblems("border-color: color-mix(in oklab, var(--palette-mint-9) 40%, transparent)")).toEqual(["rawColor", "paletteVariable"]);
    expect(stylesheetColorProblems("color: var(--color-on-surface) /* #202020 in light, var(--palette-gray-12) */")).toEqual([]);
    expect(stylesheetColorProblems("scrollbar-color: var(--color-outline) transparent")).toEqual([]);
  });
});

cssTester.run("design/stylesheet-color", stylesheetColor, {
  valid: [
    { filename: STYLESHEET, code: "body { background-color: var(--color-surface); color: var(--color-on-surface); }" },
    { filename: STYLESHEET, code: "html { scrollbar-color: var(--color-outline) transparent; }" },
    // Tailwind's and Terrazzo's syntax parses, and a keyframe's opacity is not a colour.
    { filename: STYLESHEET, code: '@theme {\n  --color-*: initial;\n  @tz (theme: "light");\n  @keyframes breath { 0%, 100% { opacity: 0.55; } }\n}' },
    { filename: STYLESHEET, code: "/* The mint is #00F3BB in light: var(--palette-mint-9). */\na { color: var(--color-primary); }" },
  ],
  invalid: [
    { filename: STYLESHEET, code: "a { color: #202020; }", errors: [{ messageId: "rawColor" }] },
    { filename: STYLESHEET, code: "a { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }", errors: [{ messageId: "rawColor" }] },
    { filename: STYLESHEET, code: "a { border-color: color-mix(in oklab, var(--color-primary) 40%, transparent); }", errors: [{ messageId: "rawColor" }] },
    { filename: STYLESHEET, code: "a { background-color: var(--palette-mint-9); }", errors: [{ messageId: "paletteVariable" }] },
    { filename: STYLESHEET, code: ":root { --palette-mint-9: #00f3bb; }", errors: [{ messageId: "rawColor" }, { messageId: "paletteVariable" }] },
    // Inside @theme, where the tolerant parser keeps the declarations as Raw text.
    { filename: STYLESHEET, code: "@theme {\n  --default-transition-duration: var(--motion-duration-short);\n  --color-glow: oklch(0.9 0.1 160);\n}", errors: [{ messageId: "rawColor" }] },
    { filename: STYLESHEET, code: "@theme {\n  --default-transition-duration: var(--motion-duration-short);\n  --color-glow: var(--palette-mint-9);\n}", errors: [{ messageId: "paletteVariable" }] },
  ],
});
