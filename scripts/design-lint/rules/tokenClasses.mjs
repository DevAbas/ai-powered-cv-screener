/**
 * design/token-classes
 *
 * Every class in a class list must name a token where the utility is one the
 * tokens own: colour, text style, line height, letter spacing, font, radius,
 * shadow, easing, animation. The rule reads the token names from the Tailwind
 * theme `npm run design:export` builds from design-system/tokens/ (`designTokens.mjs`), so
 * the one way to make a class legal is to add the token to design-system/tokens/, its rule to
 * DESIGN.md, and run the export.
 *
 * Two ways around a token are refused as well. An opacity modifier on a token
 * utility (`bg-primary/10`) makes a colour no token holds: a new tint is a
 * derived role in design-system/tokens/ (DESIGN.md, Colors). And the palette is never read by code
 * (DESIGN.md, Overview), so `bg-(--palette-mint-9)` or `[var(--palette-…)]`
 * fails; a role points to the palette, code points to the role.
 *
 * Why a lint and not the build: `palette-reset.css` removes Tailwind's own
 * palette, so `bg-red-500` produces no CSS and no error; the element is
 * simply unstyled, and nobody notices until a screenshot. An arbitrary value
 * (`text-[13px]`, `bg-[#fff]`, `rounded-[6px]`) does produce CSS, which is
 * worse: a size or colour that is in no document.
 *
 * Bad
 *   className="bg-red-500 text-[13px] rounded-[6px] font-bold shadow-lg"
 *   className="bg-surface-container-low/60 text-(--palette-gray-11)"
 *
 * Good
 *   className="bg-surface-panel text-body-sm rounded-md shadow-soft"
 *   className="text-label-md leading-(--text-label-lg--line-height)"  // a documented override reads the other style's part
 *   className="min-h-[calc(100dvh-var(--composer-height))] -ml-[calc(--spacing(2)+1px)]"  // references tokens
 *
 * A raw colour in brackets (`bg-[#fff]`, `fill-[rgb(0_0_0)]`) is left to
 * design/no-raw-color in the files it checks, so a class is reported once;
 * both rules use its `hasRawColor`. In a test file, which that rule skips, it
 * is reported here as an arbitrary value, so no file leaves it unchecked.
 *
 * Scope: JSX `className`, the arguments of `cx`, the class values of
 * `defineRecipe` / `defineSlotRecipe`, and constants those resolve to in the
 * same file (`classLists.mjs`). Variants are stripped first, so
 * `enabled:hover:bg-primary-hover` is judged on `bg-primary-hover`. Outside
 * the rule: layout utilities (`p-4`, `w-full`, `gap-2`, `grid-rows-[1fr]`),
 * arbitrary properties (`[text-box:…]`), arbitrary variants (`[&_svg]:`),
 * `transition-[…]`, and Tailwind's static keywords for a token-owned utility
 * (`text-center`, `border-b`, `ring-2`, `bg-linear-to-b`, `outline-none`).
 * The three static values allowed beyond DESIGN.md's tokens are cited where
 * they are listed below.
 *
 * Known limitation: a class list built at runtime from non-literal parts is
 * checked only where it is literal; the rule never guesses.
 */

import { loadDesignTokens, NAMESPACES } from "../designTokens.mjs";
import { checksFile, hasRawColor } from "./noRawColor.mjs";
import { classGroupCollector, classesOf, piecesOf } from "../classLists.mjs";

/** Static keywords Tailwind gives every colour utility. */
const COLOR_KEYWORDS = ["transparent", "current", "inherit"];

/**
 * The token-owned utilities: the namespace whose tokens the suffix must name,
 * what to call it in a message, the static keywords Tailwind gives the utility
 * (no token involved), and whether a bare number is a width (`ring-2`).
 * Longest prefix first, so `border-b` wins over `border`.
 */
const UTILITIES = [
  ...["border-x", "border-y", "border-t", "border-r", "border-b", "border-l", "border-s", "border-e"].map((prefix) => ({
    prefix,
    namespaces: ["color"],
    kind: "colour",
    keywords: [...COLOR_KEYWORDS],
    numeric: true,
  })),
  {
    prefix: "border",
    namespaces: ["color"],
    kind: "colour",
    keywords: [...COLOR_KEYWORDS, "solid", "dashed", "dotted", "double", "hidden", "none", "collapse", "separate"],
    patterns: [/^spacing-(x-|y-)?\d/],
    numeric: true,
  },
  {
    prefix: "bg",
    namespaces: ["color"],
    kind: "colour",
    // The gradient directions: DESIGN.md, Elevation & Depth, the header's fade from `surface` to transparent.
    keywords: [...COLOR_KEYWORDS, "none", "cover", "contain", "auto", "fixed", "local", "scroll", "top", "bottom", "left", "right", "center"],
    patterns: [/^(linear|radial|conic)-/, /^(clip|origin|position|size|repeat|no-repeat)(-|$)/, /^(top|bottom)-(left|right)$/],
  },
  {
    prefix: "text",
    namespaces: ["color", "text"],
    kind: "colour or text style",
    keywords: [...COLOR_KEYWORDS, "left", "center", "right", "justify", "start", "end", "wrap", "nowrap", "balance", "pretty", "ellipsis", "clip"],
  },
  { prefix: "ring", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "inset"], numeric: true },
  { prefix: "outline", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "none", "hidden", "solid", "dashed", "dotted", "double"], patterns: [/^offset-\d/], numeric: true },
  { prefix: "fill", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "none"] },
  { prefix: "stroke", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "none"], numeric: true },
  { prefix: "decoration", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "solid", "double", "dotted", "dashed", "wavy", "auto", "from-font"], numeric: true },
  { prefix: "divide", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "x", "y", "solid", "dashed", "dotted", "double", "none"], patterns: [/^(x|y)-\d/], numeric: true },
  { prefix: "accent", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS, "auto"] },
  { prefix: "caret", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS] },
  { prefix: "placeholder", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS] },
  { prefix: "from", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS], numeric: true },
  { prefix: "via", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS], numeric: true },
  { prefix: "to", namespaces: ["color"], kind: "colour", keywords: [...COLOR_KEYWORDS], numeric: true },
  { prefix: "leading", namespaces: ["leading"], kind: "line height", keywords: [] },
  // `tracking-normal` resets the spacing a `label-sm` parent sets: the styles without letterSpacing in DESIGN.md have none.
  { prefix: "tracking", namespaces: ["tracking"], kind: "letter spacing", keywords: ["normal"] },
  { prefix: "font", namespaces: ["font"], kind: "font", keywords: [] },
  ...["rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-s", "rounded-e"].map((prefix) => ({
    prefix,
    namespaces: ["radius"],
    kind: "radius",
    keywords: [],
  })),
  { prefix: "rounded", namespaces: ["radius"], kind: "radius", keywords: [], bare: true },
  { prefix: "shadow", namespaces: ["shadow"], kind: "shadow", keywords: ["none"], bare: true },
  { prefix: "ease", namespaces: ["ease"], kind: "easing", keywords: ["linear", "initial"] },
  // `animate-spin` is Tailwind's own: the CV preview's loading spinner (DESIGN.md, Components: CV preview).
  { prefix: "animate", namespaces: ["animate"], kind: "animation", keywords: ["none", "spin"] },
].sort((a, b) => b.prefix.length - a.prefix.length);

/** True when `--name` is a registered token in any namespace, or a variable code may read by name (motion). */
function isTokenVariable(name, tokens) {
  const property = name.replace(/^--/, "");
  if (tokens.variables.has(property)) return true;
  return NAMESPACES.some((namespace) => property.startsWith(`${namespace}-`) && tokens.theme.get(namespace).has(property.slice(namespace.length + 1)));
}

const PALETTE_VARIABLE = /--palette-/;

/**
 * Why a class is not a token, or undefined when it is one. `leaveRawColor` is
 * true where design/no-raw-color reports a raw colour itself.
 * @returns {{ messageId: string, kind: string, example: string } | undefined}
 */
export function judgeClass(base, tokens, modifier, leaveRawColor = true) {
  const utility = UTILITIES.find((candidate) => base === candidate.prefix || base.startsWith(`${candidate.prefix}-`));
  if (!utility) return undefined;
  /** One real token per namespace the utility reads: `text-on-surface` or `text-body-md`, never a colour offered for a size. */
  const example = () =>
    utility.namespaces
      .map((namespace) => {
        const names = [...(tokens.theme.get(namespace) ?? [])].filter((name) => !name.includes("--"));
        // Text is set in `on-surface`; everything else coloured sits on `surface`.
        const preferred = [utility.prefix === "text" ? "on-surface" : "surface", "md", "body-md", "standard"].find((name) => names.includes(name));
        return `${utility.prefix}-${preferred ?? names[0] ?? "…"}`;
      })
      .join("` or `");
  if (base === utility.prefix) {
    return utility.bare ? { messageId: "bareUtility", kind: utility.kind, example: example() } : undefined;
  }
  const suffix = base.slice(utility.prefix.length + 1);
  if (PALETTE_VARIABLE.test(suffix)) return { messageId: "paletteReference", kind: utility.kind, example: example() };
  // A modifier on a token utility is an opacity (a new colour) or a line height (a new text style).
  if (modifier !== undefined && !utility.keywords.includes(suffix)) return { messageId: "modifier", kind: utility.kind, example: example() };
  if (suffix.startsWith("(") && suffix.endsWith(")")) {
    const variable = suffix.slice(1, -1).replace(/^[a-z-]+:/, "");
    return isTokenVariable(variable, tokens) ? undefined : { messageId: "unknownToken", kind: utility.kind, example: example() };
  }
  if (suffix.startsWith("[") && suffix.endsWith("]")) {
    const content = suffix.slice(1, -1).replace(/^[a-z-]+:/, "");
    // design/no-raw-color reports a raw colour; reporting it here too would say the same thing twice.
    if (leaveRawColor && hasRawColor(content)) return undefined;
    // A bracket holding one variable is the long spelling of `bg-(--name)`, and is held to the same token.
    const single = /^var\((--[\w-]+)\)$/.exec(content);
    if (single) return isTokenVariable(single[1], tokens) ? undefined : { messageId: "unknownToken", kind: utility.kind, example: example() };
    return /var\(--|--[a-z]+\(/.test(content) ? undefined : { messageId: "arbitraryValue", kind: utility.kind, example: example() };
  }
  if (utility.keywords.includes(suffix)) return undefined;
  if (utility.patterns?.some((pattern) => pattern.test(suffix))) return undefined;
  if (utility.numeric && /^\d+(\.\d+)?$/.test(suffix)) return undefined;
  // `text-body-md--line-height` is a part of a style, read through a variable, never a class of its own.
  if (!suffix.includes("--") && utility.namespaces.some((namespace) => tokens.theme.get(namespace)?.has(suffix))) return undefined;
  return { messageId: "unknownToken", kind: utility.kind, example: example() };
}

/** @type {import("eslint").Rule.RuleModule} */
export const tokenClasses = {
  meta: {
    type: "problem",
    docs: { description: "Every colour, text, radius, shadow and motion class names a token" },
    messages: {
      unknownToken: "`{{class}}` is not a {{kind}} token{{note}}. Use one (`{{example}}`), or add the token to design-system/tokens/ and its rule to DESIGN.md, then run `npm run design:export`.",
      arbitraryValue: "`{{class}}` sets a literal {{kind}} that no token holds. Use a token (`{{example}}`) or reference one (`var(--…)`).",
      bareUtility: "`{{class}}` is Tailwind's default {{kind}}, not a token. Name the token (`{{example}}`).",
      modifier: "`{{class}}` changes a token with a modifier, which makes a {{kind}} no token holds. Use the token as it is (`{{example}}`); a new tint is a derived role in design-system/tokens/, with its rule in DESIGN.md (Colors).",
      paletteReference: "`{{class}}` reads the palette. Code reads roles, never primitives (DESIGN.md, Overview): use the role that points to it (`{{example}}`).",
    },
    schema: [],
  },
  create(context) {
    const tokens = loadDesignTokens(context.cwd);
    const leaveRawColor = checksFile(context.filename);
    const collector = classGroupCollector(context);
    return {
      ...collector.visitors(),
      "Program:exit"() {
        for (const group of collector.groups()) {
          for (const node of group.nodes) {
            for (const piece of piecesOf(node, context.sourceCode)) {
              for (const { parsed } of classesOf(piece.text)) {
                const verdict = judgeClass(parsed.base, tokens, parsed.modifier, leaveRawColor);
                if (!verdict) continue;
                const note = verdict.kind === "colour" ? ", and the palette reset drops an unknown colour silently" : "";
                context.report({ node, messageId: verdict.messageId, data: { class: parsed.raw, kind: verdict.kind, example: verdict.example, note } });
              }
            }
          }
        }
      },
    };
  },
};
