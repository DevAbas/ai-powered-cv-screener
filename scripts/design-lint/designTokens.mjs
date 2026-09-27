// The design system's names, read from the files that define them, so a lint
// rule accepts exactly what the tokens define and nothing else. The roles come
// from the Tailwind theme `npm run design:export` builds from tokens/
// (`src/styles/theme.generated.css`, its `@theme` blocks), the variables code
// may read by name from the `:root` of `src/styles/tokens.generated.css`, and
// the component tokens from the `components:` contract in DESIGN.md's front
// matter, which holds no values. The palette is read only
// to be refused: code never names a primitive (DESIGN.md, Overview). Plain
// JavaScript: ESLint loads its config without a TypeScript loader.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** The files, relative to the repository root. */
export const TOKEN_FILES = {
  generated: "src/styles/tokens.generated.css",
  theme: "src/styles/theme.generated.css",
  design: "DESIGN.md",
};

/**
 * The Tailwind theme namespaces a DESIGN.md token can live in, longest prefix
 * first so `--font-weight-x` is a weight, not a family.
 */
export const NAMESPACES = ["font-weight", "color", "text", "leading", "tracking", "font", "radius", "shadow", "ease", "animate", "container", "breakpoint", "spacing"];

/**
 * The plain `:root` variables a class may read by name though they make no
 * utility: motion (`duration-(--motion-duration-short)`). The palette
 * (`--palette-*`) is not among them.
 */
export const VARIABLE_PREFIXES = ["motion"];

/**
 * @typedef {Object} DesignTokens
 * @property {ReadonlyMap<string, ReadonlySet<string>>} theme token names per namespace (`color` → `surface`, `primary`, …)
 * @property {ReadonlySet<string>} colors the colour roles (the `--color-*` of the generated theme)
 * @property {ReadonlySet<string>} palette the palette entries (`--palette-*`), which code never reads
 * @property {ReadonlyMap<string, ReadonlyMap<string, string>>} components each component token's properties (`backgroundColor` → `colors.primary`)
 * @property {ReadonlySet<string>} variables the `--motion-*` variables a class may read
 * @property {ReadonlySet<string>} names what a recipe may cite: DESIGN.md's components, and the tokens' roles, text styles and radii
 */

/**
 * Every `--<namespace>-<name>:` declaration inside a `@theme` block (including
 * `@theme inline`), by namespace. A declaration whose value is `initial` (the
 * palette reset) registers nothing.
 * @param {string} css
 * @returns {Map<string, Set<string>>}
 */
export function parseThemeTokens(css) {
  const tokens = new Map(NAMESPACES.map((namespace) => [namespace, new Set()]));
  let from = 0;
  for (;;) {
    const start = css.indexOf("@theme", from);
    if (start === -1) break;
    const open = css.indexOf("{", start);
    if (open === -1) break;
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}" && --depth === 0) break;
    }
    const block = css.slice(open + 1, end);
    for (const match of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [, property, value] = match;
      if (value.trim() === "initial") continue;
      const namespace = NAMESPACES.find((candidate) => property.startsWith(`${candidate}-`));
      if (!namespace) continue;
      tokens.get(namespace).add(property.slice(namespace.length + 1));
    }
    from = end + 1;
  }
  return tokens;
}

/**
 * Each component token's properties, as the group and name its references
 * point to (`{color.primary}` → `color.primary`), from the `components:`
 * contract in DESIGN.md's front matter. It is read as YAML with the same
 * parser the export's contract check uses (scripts/design-tokens/designDocument.ts),
 * so the lint and the export always see the same contract, whatever YAML style
 * it is written in. A property that states a value instead of a reference is
 * left out: the contract check reports it.
 * @param {string} designMd
 * @returns {Map<string, Map<string, string>>}
 */
export function parseComponents(designMd) {
  const lines = designMd.split("\n");
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end === -1) return new Map();
  const front = parse(lines.slice(1, end).join("\n")) ?? {};
  const components = new Map();
  for (const [component, properties] of Object.entries(front.components ?? {})) {
    const references = new Map();
    for (const [property, value] of Object.entries(properties ?? {})) {
      const reference = /^\{([a-z]+\.[a-z0-9-]+)\}$/.exec(String(value));
      if (reference) references.set(property, reference[1]);
    }
    components.set(component, references);
  }
  return components;
}

/**
 * The custom properties declared in the stylesheet's `:root` blocks (not in
 * `@theme`), by the prefix before their first hyphen: `palette`, `ds`, `motion`.
 * @param {string} css
 * @returns {Map<string, Set<string>>}
 */
export function parseRootVariables(css) {
  const variables = new Map();
  for (const match of css.matchAll(/:root\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    for (const [, name] of match[1].matchAll(/--([a-z0-9-]+)\s*:/g)) {
      const prefix = name.split("-")[0];
      if (!variables.has(prefix)) variables.set(prefix, new Set());
      variables.get(prefix).add(name);
    }
  }
  return variables;
}

/** @type {Map<string, DesignTokens>} */
const cache = new Map();

/**
 * The tokens of the repository at `root`, read once per process: a lint run
 * sees one design system.
 * @param {string} root
 * @returns {DesignTokens}
 */
export function loadDesignTokens(root) {
  const cached = cache.get(root);
  if (cached) return cached;
  const read = (file) => readFileSync(join(root, file), "utf8");
  const css = `${read(TOKEN_FILES.generated)}\n${read(TOKEN_FILES.theme)}`;
  const theme = parseThemeTokens(css);
  const roots = parseRootVariables(css);
  // DESIGN.md holds no values, only the components' contract, so that is all it is read for.
  const components = parseComponents(read(TOKEN_FILES.design));
  const tokens = {
    theme,
    colors: theme.get("color") ?? new Set(),
    palette: new Set([...(roots.get("palette") ?? [])].map((name) => name.slice("palette-".length))),
    components,
    variables: new Set(VARIABLE_PREFIXES.flatMap((prefix) => [...(roots.get(prefix) ?? [])])),
    // What a recipe may cite: the components DESIGN.md names, and the roles, text styles and radii of the tokens.
    names: new Set([
      ...components.keys(),
      ...(theme.get("color") ?? []),
      ...[...(theme.get("text") ?? [])].filter((name) => !name.includes("--")),
      ...(theme.get("radius") ?? []),
    ]),
  };
  cache.set(root, tokens);
  return tokens;
}
