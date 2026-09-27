import { describe, expect, it } from "vitest";
import { loadDesignTokens } from "../designTokens.mjs";
import { judgeClass, tokenClasses } from "../rules/tokenClasses.mjs";
import { COMPONENT, RECIPE, ruleTester } from "./ruleTester";

const tokens = loadDesignTokens(process.cwd());

describe("judgeClass", () => {
  it("accepts tokens, Tailwind's static keywords and token references", () => {
    const fine = [
      "bg-surface-container",
      "text-on-surface",
      "text-body-md",
      "text-center",
      "border-b",
      "border-outline",
      "border-collapse",
      "border-spacing-x-4",
      "ring-2",
      "ring-primary-outline",
      "outline-none",
      "fill-current",
      "bg-linear-to-b",
      "from-surface",
      "to-transparent",
      "rounded-md",
      "rounded-full",
      "shadow-soft",
      "shadow-none",
      "tracking-normal",
      "font-sans",
      "font-display-light",
      // A documented override reads the other style's part.
      "leading-(--text-label-lg--line-height)",
      "tracking-(--text-label-sm--letter-spacing)",
      "font-(weight:--text-label-lg--font-weight)",
      "bg-surface-panel",
      "text-on-surface-subtle",
      "ease-decelerate",
      "ease-(--ease-accelerate)",
      "animate-breath",
      "animate-spin",
      // Not token-owned: layout, arbitrary properties and variants, transitions.
      "p-4",
      "w-full",
      "min-w-(--button-width)",
      "grid-rows-[1fr]",
      "[grid-template-rows:1fr]",
      "[text-box:trim-both_cap_alphabetic]",
      "transition-[background-color,box-shadow]",
      "min-h-[calc(100dvh_-_var(--spacing-base)*30_-_var(--composer-height))]",
      "duration-(--motion-duration-short)",
      "ml-[calc(--spacing(2)+1px)]",
      // One variable in brackets is the long spelling of `bg-(--name)`, held to the same token.
      "bg-[var(--color-surface)]",
      "text-[color:var(--color-on-surface)]",
      // A raw colour is design/no-raw-color's to report, so it is reported once.
      "bg-[#fff]",
      "fill-[rgb(0_0_0)]",
    ];
    for (const cls of fine) expect(judgeClass(cls, tokens), cls).toBeUndefined();
  });

  it("rejects Tailwind's palette and defaults, literal values, and unregistered variables", () => {
    expect(judgeClass("bg-red-500", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("text-gray-700", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("text-xl", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("font-bold", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("leading-5", tokens)?.messageId).toBe("unknownToken");
    // A style is one unit: its parts are not classes of their own.
    expect(judgeClass("leading-body-md", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("text-body-md--line-height", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("shadow-lg", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("rounded-2xl", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("ease-in-out", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("ease-(--button-width)", tokens)?.messageId).toBe("unknownToken");
    expect(judgeClass("rounded", tokens)?.messageId).toBe("bareUtility");
    expect(judgeClass("shadow", tokens)?.messageId).toBe("bareUtility");
    expect(judgeClass("text-[13px]", tokens)?.messageId).toBe("arbitraryValue");
    expect(judgeClass("bg-[red]", tokens)?.messageId).toBe("arbitraryValue");
    expect(judgeClass("bg-[var(--not-a-token)]", tokens)?.messageId).toBe("unknownToken");
    // Where design/no-raw-color does not check (a test file), a raw colour is this rule's to report.
    expect(judgeClass("bg-[#fff]", tokens, undefined, false)?.messageId).toBe("arbitraryValue");
    expect(judgeClass("rounded-[6px]", tokens)?.messageId).toBe("arbitraryValue");
  });

  it("refuses a colour made by opacity, and any read of the palette", () => {
    expect(judgeClass("bg-primary", tokens, "10")?.messageId).toBe("modifier");
    expect(judgeClass("text-body-md", tokens, "6")?.messageId).toBe("modifier");
    expect(judgeClass("text-(--palette-gray-11)", tokens)?.messageId).toBe("paletteReference");
    expect(judgeClass("bg-[var(--palette-mint-9)]", tokens)?.messageId).toBe("paletteReference");
  });

  it("offers an example of the kind the utility reads, never a colour for a size", () => {
    expect(judgeClass("text-[13px]", tokens)?.example).toBe("text-on-surface` or `text-body-md");
    expect(judgeClass("bg-red-500", tokens)?.example).toBe("bg-surface");
  });
});

ruleTester.run("design/token-classes", tokenClasses, {
  valid: [
    { filename: COMPONENT, code: '<div className="bg-surface-panel rounded-md text-body-md text-on-surface" />' },
    { filename: COMPONENT, code: '<button className="enabled:hover:bg-surface-container-high group-data-[modality=keyboard]/menu:data-focus:bg-surface-container-low has-[textarea:focus-visible]:ring-2 motion-safe:animate-spin" />' },
    { filename: COMPONENT, code: "<div className={`flex ${open ? \"bg-primary\" : \"bg-surface\"}`} />" },
    { filename: COMPONENT, code: 'import { cx } from "@/components/ui/recipe";\nconst CARD = "rounded-md border border-outline";\nexport const cardClass = (active: boolean) => cx(CARD, active && "bg-surface-container-low");' },
    {
      filename: RECIPE,
      code: 'export const r = defineRecipe({ base: ["rounded-full text-label-md"], variants: { variant: { primary: "bg-primary text-on-primary" }, size: { sm: "h-8" } }, compoundVariants: [{ variant: "primary", size: "sm", class: "px-3" }], defaultVariants: { variant: "primary" } });',
    },
    { filename: RECIPE, code: 'export const s = defineSlotRecipe({ slots: { root: "bg-surface", item: ["text-body-sm", "rounded-sm"] }, variants: { tone: { quiet: { root: "text-on-surface-variant" } } } });' },
    // Not a class position: the rule never guesses.
    { filename: COMPONENT, code: 'const message = "bg-red-500 is not a token";' },
  ],
  invalid: [
    { filename: COMPONENT, code: '<div className="bg-red-500" />', errors: [{ messageId: "unknownToken", data: { class: "bg-red-500", kind: "colour", example: "bg-surface", note: ", and the palette reset drops an unknown colour silently" } }] },
    { filename: COMPONENT, code: '<div className="bg-surface-container-low/60 text-(--palette-gray-11)" />', errors: [{ messageId: "modifier" }, { messageId: "paletteReference" }] },
    { filename: COMPONENT, code: '<div className="text-[13px] rounded-[6px]" />', errors: [{ messageId: "arbitraryValue" }, { messageId: "arbitraryValue" }] },
    // A test file: design/no-raw-color skips it, so the raw colour is reported here instead of by nobody.
    { filename: "src/components/ui/__tests__/Probe.test.tsx", code: '<div className="bg-[#fff]" />', errors: [{ messageId: "arbitraryValue" }] },
    { filename: COMPONENT, code: '<div className={cond ? "shadow-lg" : "shadow-soft"} />', errors: [{ messageId: "unknownToken" }] },
    { filename: COMPONENT, code: "<div className={`p-2 ${cond && \"font-bold\"}`} />", errors: [{ messageId: "unknownToken" }] },
    // The constant is reported once, at its declaration.
    { filename: COMPONENT, code: 'import { cx } from "@/components/ui/recipe";\nconst CARD = "rounded bg-surface";\nconst a = cx(CARD, "p-2");\nconst b = cx(CARD, "p-3");', errors: [{ messageId: "bareUtility", line: 2 }] },
    { filename: RECIPE, code: 'export const r = defineRecipe({ base: "rounded-full", variants: { variant: { primary: "bg-mint" } } });', errors: [{ messageId: "unknownToken", data: { class: "bg-mint", kind: "colour", example: "bg-surface", note: ", and the palette reset drops an unknown colour silently" } }] },
    { filename: RECIPE, code: 'export const r = defineRecipe({ base: "rounded-full", compoundVariants: [{ size: "sm", class: "text-xs" }] });', errors: [{ messageId: "unknownToken" }] },
    { filename: RECIPE, code: 'export const s = defineSlotRecipe({ slots: { root: "ease-in-out" } });', errors: [{ messageId: "unknownToken", data: { class: "ease-in-out", kind: "easing", example: "ease-standard", note: "" } }] },
  ],
});
