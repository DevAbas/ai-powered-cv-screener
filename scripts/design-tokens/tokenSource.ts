// The design tokens as their source of truth writes them: W3C Design Tokens
// (DTCG 2025.10) under design-system/tokens/, orchestrated by design-system/tokens/design.resolver.json.
// @terrazzo/parser reads the files, checks them against the format and
// resolves each theme; this module reads the result in the design system's
// three tiers and checks the rules between them that DTCG leaves to a team
// (DTCG FAQ: "leaving organizational strategy to design system teams"):
//
// - the palette (`palette.*`) holds values only, never an alias;
// - a colour role (`color.*`) points to the palette in every theme, or is
//   derived: a value its rule (`$extensions.cv-screener.derived`) gives there;
// - both themes define the same roles, with the same rules;
// - a text style's family and weight point to the foundation (`font.*`).

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { defineConfig, parse } from "@terrazzo/parser";
import type { DerivedRule } from "./derivedColors";
import { derivedHex, derivedRuleOf } from "./derivedColors";

export const RESOLVER_PATH = "design-system/tokens/design.resolver.json";
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** A resolved token, as much of @terrazzo/parser's normalized token as this module reads. */
interface ResolvedToken {
  $type: string;
  $value: unknown;
  /** The alias chain from the token's own reference to the value: `[0]` is what the token points to directly. */
  aliasChain?: string[] | undefined;
  aliasOf?: string | undefined;
  $extensions?: Record<string, unknown> | undefined;
}

interface Dimension {
  value: number;
  unit: string;
}

/** A colour role in one theme: the palette entry it points to, or its rule; and its hex there. */
export type ThemedRole = { kind: "palette"; palette: string; hex: string } | { kind: "derived"; rule: DerivedRule; hex: string };

export interface TextStyle {
  fontFamily: string;
  fontSize: Dimension;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: Dimension;
}

export interface Shadow {
  offsetX: Dimension;
  offsetY: Dimension;
  blur: Dimension;
  opacity: number;
}

export interface TokenSource {
  name: string;
  description: string;
  /** Palette entry → hex. */
  palette: ReadonlyMap<string, string>;
  /** Theme → role → the role there. */
  roles: Readonly<Record<Theme, ReadonlyMap<string, ThemedRole>>>;
  /** Theme → shadow → the shadow there. */
  shadows: Readonly<Record<Theme, ReadonlyMap<string, Shadow>>>;
  typography: ReadonlyMap<string, TextStyle>;
  /** Group (`rounded`, `spacing`, `breakpoints`, `containers`) → name → dimension. */
  dimensions: Readonly<Record<"rounded" | "spacing" | "breakpoints" | "containers", ReadonlyMap<string, Dimension>>>;
  /** Motion token → its `$type` and value. */
  motion: ReadonlyMap<string, { type: "cubicBezier" | "duration" | "dimension"; value: number[] | Dimension }>;
}

export class TokenSourceError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`The design tokens break the tier rules:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  }
}

/**
 * Each token's position in the files the resolver lists, in the order they are
 * written: resolved tokens come back in no particular order, and what is built
 * from them (the composed document the design lint reads, the problems it
 * reports) keeps the authors' order.
 */
function authoredOrder(root: URL, resolverDocument: unknown): Map<string, number> {
  const order = new Map<string, number>();
  // The files the resolver references ($ref to a file, not to a place in the resolver itself), in document order.
  const refs: string[] = [];
  const collect = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === "object") {
      const ref = (node as { $ref?: unknown }).$ref;
      if (typeof ref === "string" && !ref.startsWith("#")) refs.push(ref);
      else Object.values(node).forEach(collect);
    }
  };
  collect(resolverDocument);
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== "object") return;
    if ("$value" in node) {
      const id = path.join(".");
      if (!order.has(id)) order.set(id, order.size);
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...path, key]);
  };
  for (const ref of refs) walk(JSON.parse(readFileSync(new URL(ref, new URL(RESOLVER_PATH, root)), "utf8")), []);
  return order;
}

/** The tokens of one group in authored order, by the name after the group (`color.primary` → `primary`). */
function inGroup(tokens: Record<string, ResolvedToken>, group: string, order: ReadonlyMap<string, number>): [string, ResolvedToken][] {
  return Object.entries(tokens)
    .filter(([id]) => id.startsWith(`${group}.`))
    .sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
    .map(([id, token]) => [id.slice(group.length + 1), token]);
}

const hexOf = (value: unknown) => ((value as { hex?: string }).hex ?? "").toLowerCase();

/** Reads design-system/tokens/ through the resolver at `cwd` and checks the tier rules; throws a `TokenSourceError` listing every broken one. */
export async function readTokenSource(cwd = process.cwd()): Promise<TokenSource> {
  const root = pathToFileURL(`${cwd}/`);
  const filename = new URL(RESOLVER_PATH, root);
  const config = defineConfig({}, { cwd: root });
  const { resolver } = await parse([{ filename, src: readFileSync(filename, "utf8") }], { config });
  const resolverDocument = JSON.parse(readFileSync(filename, "utf8")) as { name?: string; description?: string };
  const order = authoredOrder(root, resolverDocument);
  const themed = Object.fromEntries(THEMES.map((theme) => [theme, resolver.apply({ theme }) as unknown as Record<string, ResolvedToken>])) as Record<Theme, Record<string, ResolvedToken>>;
  const problems: string[] = [];

  // The palette is the same in every theme and holds values only.
  const palette = new Map<string, string>();
  for (const [name, token] of inGroup(themed.light, "palette", order)) {
    if (token.$type !== "color") problems.push(`palette.${name} is a ${token.$type}, not a color`);
    else if (token.aliasOf) problems.push(`palette.${name} is an alias of ${token.aliasOf}: the palette holds values only`);
    else palette.set(name, hexOf(token.$value));
  }

  const roles = {} as Record<Theme, Map<string, ThemedRole>>;
  for (const theme of THEMES) {
    const inTheme = new Map<string, ThemedRole>();
    const entries = inGroup(themed[theme], "color", order);
    for (const [role, token] of entries) {
      const rule = derivedRuleOf(token.$extensions);
      // What the token points to itself: a role that points to another role hides the palette entry behind it.
      const target = token.aliasChain?.[0];
      const hex = hexOf(token.$value);
      if (rule) inTheme.set(role, { kind: "derived", rule, hex });
      else {
        if (!target?.startsWith("palette.")) problems.push(`${theme}: color.${role} ${target ? `points to ${target}` : "is a literal"}: a role points to the palette, or is derived by a rule`);
        // Kept even when broken, so one mistake is reported once, not again by every rule that reads the role.
        inTheme.set(role, { kind: "palette", palette: target?.replace(/^palette\./, "") ?? "", hex });
      }
    }
    // A derived role's value is what its rule gives from this theme's roles.
    for (const [role, entry] of inTheme) {
      if (entry.kind !== "derived") continue;
      const missing = [entry.rule.from, entry.rule.kind === "mix" ? entry.rule.over : entry.rule.from].filter((from) => !inTheme.has(from));
      if (missing.length > 0) {
        problems.push(`${theme}: color.${role} derives from ${missing.join(", ")}, which is not a role`);
        continue;
      }
      const expected = derivedHex(entry.rule, (from) => inTheme.get(from)?.hex ?? "#000000");
      if (expected !== entry.hex) problems.push(`${theme}: color.${role} is ${entry.hex}, but its rule gives ${expected}`);
    }
    roles[theme] = inTheme;
  }
  // Both themes define the same roles, each derived the same way.
  for (const role of new Set([...roles.light.keys(), ...roles.dark.keys()])) {
    const [light, dark] = [roles.light.get(role), roles.dark.get(role)];
    if (!light || !dark) problems.push(`color.${role} is defined in ${light ? "light" : "dark"} only`);
    else if (light.kind !== dark.kind || JSON.stringify(light.kind === "derived" && light.rule) !== JSON.stringify(dark.kind === "derived" && dark.rule)) problems.push(`color.${role} is derived differently in light and dark`);
  }

  const shadows = {} as Record<Theme, Map<string, Shadow>>;
  for (const theme of THEMES) {
    shadows[theme] = new Map(
      inGroup(themed[theme], "shadow", order).map(([name, token]) => {
        const [layer] = token.$value as { color: { alpha?: number }; offsetX: Dimension; offsetY: Dimension; blur: Dimension }[];
        return [name, { offsetX: layer.offsetX, offsetY: layer.offsetY, blur: layer.blur, opacity: layer.color.alpha ?? 1 }];
      }),
    );
  }

  // Text styles take their family and weight from the foundation.
  const typography = new Map<string, TextStyle>();
  const styleSources = JSON.parse(readFileSync(new URL("design-system/tokens/semantic/typography.tokens.json", root), "utf8")) as { typography: Record<string, { $value?: { fontFamily?: unknown; fontWeight?: unknown } }> };
  for (const [name, token] of inGroup(themed.light, "typography", order)) {
    const value = token.$value as { fontFamily: string[]; fontSize: Dimension; fontWeight: number; lineHeight: number; letterSpacing: Dimension };
    const authored = styleSources.typography[name]?.$value;
    for (const part of ["fontFamily", "fontWeight"] as const) {
      if (typeof authored?.[part] !== "string" || !String(authored[part]).startsWith("{font.")) problems.push(`typography.${name}.${part} is a literal: a text style takes its ${part} from the foundation (font.*)`);
    }
    typography.set(name, { fontFamily: value.fontFamily[0], fontSize: value.fontSize, fontWeight: value.fontWeight, lineHeight: value.lineHeight, letterSpacing: value.letterSpacing });
  }

  const dimensionGroup = (group: string) => new Map(inGroup(themed.light, group, order).map(([name, token]) => [name, token.$value as Dimension]));
  const motion = new Map(inGroup(themed.light, "motion", order).map(([name, token]) => [name, { type: token.$type as "cubicBezier" | "duration" | "dimension", value: token.$value as number[] | Dimension }]));

  if (problems.length > 0) throw new TokenSourceError(problems);
  return {
    name: resolverDocument.name ?? "",
    description: resolverDocument.description ?? "",
    palette,
    roles,
    shadows,
    typography,
    dimensions: { rounded: dimensionGroup("rounded"), spacing: dimensionGroup("spacing"), breakpoints: dimensionGroup("breakpoints"), containers: dimensionGroup("containers") },
    motion,
  };
}
