// The colour roles derived from other roles (DESIGN.md, Colors: derived
// roles). The rule is part of the token itself, in its `$extensions` under
// `cv-screener.derived` (tokens/themes/*.tokens.json), and the token's value is
// what the rule gives in that theme: hover and pressed are static per theme in
// every major design system (Radix steps, Spectrum and Primer tokens,
// Material's state layers), and DTCG has no colour functions. This module
// reads a rule and applies it; the colour maths is lightningcss's, which
// resolves CSS Color 4 relative colours and `color-mix()` to sRGB.

import { transform } from "lightningcss";
import { z } from "zod";

const DerivedRuleSchema = z.discriminatedUnion("kind", [
  /** The role with its OKLCH lightness moved by `lightness` (0–1), hue and chroma kept. */
  z.object({ kind: z.literal("lightness"), from: z.string(), lightness: z.number() }),
  /** `from` at `weight` over `over`: the tint a translucent role leaves on the page, made opaque. */
  z.object({ kind: z.literal("mix"), from: z.string(), weight: z.number(), over: z.string() }),
]);

export type DerivedRule = z.infer<typeof DerivedRuleSchema>;

/** The `$extensions` key this design system writes its additions under (a vendor-specific key, DTCG Format 5.2.3). */
export const EXTENSION_KEY = "cv-screener";

/** The derived rule a token carries, undefined when it has none; throws on a malformed one. */
export function derivedRuleOf(extensions: unknown): DerivedRule | undefined {
  const rule = (extensions as Record<string, { derived?: unknown } | undefined> | undefined)?.[EXTENSION_KEY]?.derived;
  return rule === undefined ? undefined : DerivedRuleSchema.parse(rule);
}

/** The rule in words, for a token's description. */
export function describeRule(rule: DerivedRule): string {
  return rule.kind === "lightness"
    ? `${rule.from} with its OKLCH lightness ${rule.lightness > 0 ? "+" : ""}${rule.lightness}, hue and chroma kept`
    : `${rule.from} at ${Math.round(rule.weight * 100)}% over ${rule.over}`;
}

/** The rule as a CSS colour, with the roles it reads already resolved to hex. */
function ruleCss(rule: DerivedRule, roleHex: (role: string) => string): string {
  if (rule.kind === "lightness") {
    const sign = rule.lightness < 0 ? "-" : "+";
    return `oklch(from ${roleHex(rule.from)} calc(l ${sign} ${Math.abs(rule.lightness)}) c h)`;
  }
  return `color-mix(in srgb, ${roleHex(rule.from)} ${Math.round(rule.weight * 100)}%, ${roleHex(rule.over)})`;
}

/** The sRGB hex a rule gives, `roleHex` resolving the roles it reads in one theme. */
export function derivedHex(rule: DerivedRule, roleHex: (role: string) => string): string {
  // A target without relative colour or color-mix makes lightningcss resolve the value to an sRGB fallback.
  const { code } = transform({ filename: "derived.css", code: Buffer.from(`a{color:${ruleCss(rule, roleHex)}}`), targets: { chrome: 80 << 16 } });
  const resolved = /color:\s*([^;}]+?)\s*[;}]/.exec(code.toString())?.[1];
  // The fallback is written in its shortest form, a hex or a named colour (#808080 is `gray`): its visitor reads either as channels.
  let channels: { r: number; g: number; b: number } | undefined;
  if (resolved) {
    transform({
      filename: "resolved.css",
      code: Buffer.from(`a{color:${resolved}}`),
      visitor: {
        Color: (color) => {
          if (typeof color === "object" && color.type === "rgb") channels = color;
        },
      },
    });
  }
  if (!channels) throw new Error(`lightningcss did not resolve ${ruleCss(rule, roleHex)} to an sRGB colour`);
  const { r, g, b } = channels;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
