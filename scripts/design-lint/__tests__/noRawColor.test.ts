import { describe, expect, it } from "vitest";
import { hasRawColor, noRawColor } from "../rules/noRawColor.mjs";
import { COMPONENT, ruleTester } from "./ruleTester";

describe("hasRawColor", () => {
  it("sees hex and colour functions with literal channels, not issue numbers or channels read from variables", () => {
    expect(hasRawColor("#333")).toBe(true);
    expect(hasRawColor("#00F8C0aa")).toBe(true);
    expect(hasRawColor("see #1234567")).toBe(false);
    expect(hasRawColor("rgba(0, 0, 0, 0.12)")).toBe(true);
    expect(hasRawColor("oklch(from var(--color-primary) l c h)")).toBe(false);
    expect(hasRawColor("rgba(\0, \0, \0, \0)")).toBe(false);
  });
});

ruleTester.run("design/no-raw-color", noRawColor, {
  valid: [
    { filename: COMPONENT, code: 'const cls = "bg-surface text-on-surface";' },
    // Channels read from the computed token colour: a colour utility, not a choice.
    { filename: COMPONENT, code: "const paint = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;" },
    { filename: COMPONENT, code: "// the mint is #00F8C0 in light\nconst x = 1;" },
    { filename: "src/components/ui/__tests__/Probe.test.ts", code: 'expect(color).toBe("#00F8C0");' },
    { filename: "src/lib/search/rankFusion.test.ts", code: 'const c = "#fff";' },
  ],
  invalid: [
    { filename: COMPONENT, code: 'const TINT = "#333";', errors: [{ messageId: "rawColor" }] },
    { filename: COMPONENT, code: "const shadow = `0 1px 2px rgba(0, 0, 0, 0.12)`;", errors: [{ messageId: "rawColor" }] },
    { filename: COMPONENT, code: 'const mix = "color-mix(in srgb, #202020 50%, transparent)";', errors: [{ messageId: "rawColor" }] },
    { filename: COMPONENT, code: 'const el = <div style={{ color: "hsl(160 100% 40%)" }} />;', errors: [{ messageId: "rawColor" }] },
    // A raw colour in a class: this rule reports it, and design/token-classes leaves it here.
    { filename: COMPONENT, code: '<div className="bg-[#fff]" />', errors: [{ messageId: "rawColor" }] },
  ],
});
