// DESIGN.md as the design system's rules: its front matter holds no values.
// `imports:` names the design tokens it reads (the token import the format
// plans, google-labs-code/design.md#13 and #66; until the format reads it,
// this module does), and `components:` names, by token id (`color.primary`,
// `typography.label-md`, `rounded.full`), the roles each component reads.
// This module checks both against the tokens, and composes, in memory only,
// the document @google/design.md's linter needs to check contrast and
// references: the contract with one theme's values from the tokens. Nothing
// here is written back: DESIGN.md is never a second token database.

import { parse } from "yaml";
import type { Theme, TokenSource } from "./tokenSource";

/** The token groups a component may read, by their id prefix in tokens/. */
const READABLE = ["color", "typography", "rounded"] as const;
const REFERENCE = /^\{([a-z]+)\.([a-z0-9-]+)\}$/;

/** DESIGN.md's front matter: its YAML and the lines of the body after it. */
function split(designMd: string): { yaml: string; body: string } {
  const lines = designMd.split("\n");
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1) throw new Error("DESIGN.md has no closed front matter");
  return { yaml: lines.slice(1, end).join("\n"), body: lines.slice(end + 1).join("\n") };
}

interface FrontMatter {
  name?: string;
  description?: string;
  imports?: string;
  components?: Record<string, Record<string, string>>;
}

/** The components contract: component → property → the token reference it names. */
export function componentsContract(designMd: string): Record<string, Record<string, string>> {
  return (parse(split(designMd).yaml) as FrontMatter).components ?? {};
}

/**
 * Where the contract breaks the rules: DESIGN.md states a value instead of
 * naming a token, a component reads the palette, or names a token the tokens
 * do not define.
 */
export function contractProblems(designMd: string, source: TokenSource, resolverPath: string): string[] {
  const front = parse(split(designMd).yaml) as Record<string, unknown>;
  const problems = Object.keys(front)
    .filter((key) => !["version", "name", "description", "imports", "components"].includes(key))
    .map((key) => `DESIGN.md's front matter holds \`${key}:\`: values live in the design tokens it imports, DESIGN.md holds rules`);
  const imports = String(front.imports ?? "").replace(/^\.\//, "");
  if (imports !== resolverPath) problems.push(`DESIGN.md imports ${front.imports ?? "nothing"}: it imports the design tokens at ./${resolverPath}`);
  const known: Record<(typeof READABLE)[number], ReadonlySet<string>> = {
    color: new Set(source.roles.light.keys()),
    typography: new Set(source.typography.keys()),
    rounded: new Set(source.dimensions.rounded.keys()),
  };
  for (const [component, properties] of Object.entries(componentsContract(designMd))) {
    for (const [property, value] of Object.entries(properties)) {
      const reference = REFERENCE.exec(String(value));
      if (!reference) {
        problems.push(`components.${component}.${property} is ${value}: a component names a token (\`{color.…}\`), it does not state a value`);
        continue;
      }
      const [, group, name] = reference;
      if (group === "palette") problems.push(`components.${component}.${property} reads the palette entry ${name}: components read roles`);
      else if (!(READABLE as readonly string[]).includes(group) || !known[group as (typeof READABLE)[number]].has(name)) problems.push(`components.${component}.${property} names ${value}, which the tokens do not define`);
    }
  }
  return problems;
}

const dimension = ({ value, unit }: { value: number; unit: string }) => `${value}${unit}`;
const quoted = (value: string) => JSON.stringify(value);

/**
 * The document @google/design.md's linter reads (its docs/spec.md): DESIGN.md
 * with one theme's values from the tokens as front-matter groups, and the
 * contract's references renamed to the format's (`{color.x}` → `{colors.x}`).
 * For linting only: never written to disk.
 */
export function lintDocument(designMd: string, source: TokenSource, theme: Theme): string {
  const { body } = split(designMd);
  const front = parse(split(designMd).yaml) as FrontMatter;
  const lines = ["---", `name: ${quoted(front.name ?? source.name)}`, "colors:"];
  for (const [name, hex] of source.palette) lines.push(`  ${name}: ${quoted(hex.toUpperCase())}`);
  // Light keeps the aliases, so the linter sees which palette entries roles read; dark states each role's value there.
  for (const [role, entry] of source.roles[theme]) lines.push(`  ${role}: ${quoted(theme === "light" && entry.kind === "palette" ? `{colors.${entry.palette}}` : entry.hex.toUpperCase())}`);
  lines.push("typography:");
  for (const [name, style] of source.typography) {
    const em = Math.round((style.letterSpacing.value / style.fontSize.value) * 10000) / 10000;
    lines.push(`  ${name}:`, `    fontFamily: ${style.fontFamily}`, `    fontSize: ${dimension(style.fontSize)}`, `    fontWeight: ${style.fontWeight}`, `    lineHeight: ${quoted(String(style.lineHeight))}`);
    if (em !== 0) lines.push(`    letterSpacing: ${em}em`);
  }
  lines.push("rounded:", ...[...source.dimensions.rounded].map(([name, value]) => `  ${name}: ${dimension(value)}`));
  lines.push("spacing:", ...[...source.dimensions.spacing].map(([name, value]) => `  ${name}: ${dimension(value)}`));
  lines.push("components:");
  for (const [component, properties] of Object.entries(front.components ?? {})) {
    lines.push(`  ${component}:`, ...Object.entries(properties).map(([property, value]) => `    ${property}: ${quoted(String(value).replace(/^\{color\./, "{colors."))}`));
  }
  return [...lines, "---", body].join("\n");
}
