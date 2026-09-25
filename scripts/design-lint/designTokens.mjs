// The design system's names, read from the files that define them, so a lint
// rule accepts exactly what DESIGN.md exports and nothing else. Light tokens
// come from `src/styles/tokens.generated.css` (`npm run design:export`), the
// prose-only values (shadows, easings, animations, containers, breakpoints)
// from `src/styles/theme.css`, and the component tokens and colour roles from
// DESIGN.md's front matter. Plain JavaScript: ESLint loads its config without
// a TypeScript loader.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The files, relative to the repository root. */
export const TOKEN_FILES = {
  generated: "src/styles/tokens.generated.css",
  theme: "src/styles/theme.css",
  design: "DESIGN.md",
};

/**
 * The Tailwind theme namespaces a DESIGN.md token can live in, longest prefix
 * first so `--font-weight-x` is a weight, not a family.
 */
export const NAMESPACES = ["font-weight", "color", "text", "leading", "tracking", "font", "radius", "shadow", "ease", "animate", "container", "breakpoint", "spacing"];

/**
 * @typedef {Object} DesignTokens
 * @property {ReadonlyMap<string, ReadonlySet<string>>} theme token names per namespace (`color` → `surface`, `primary`, …)
 * @property {ReadonlySet<string>} colors the colour roles of DESIGN.md's front matter
 * @property {ReadonlySet<string>} components the component token names of DESIGN.md's front matter
 * @property {ReadonlySet<string>} names every name DESIGN.md's front matter defines, in any section
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
 * The names DESIGN.md's front matter defines, per section: the
 * two-space-indented keys under `colors:`, `typography:`, `rounded:`,
 * `spacing:` and `components:`.
 * @param {string} designMd
 * @returns {Map<string, Set<string>>}
 */
export function parseDesignFrontMatter(designMd) {
  const sections = new Map();
  let inFrontMatter = false;
  let section = "";
  designMd.split("\n").forEach((line, i) => {
    if (line === "---") {
      inFrontMatter = i === 0;
      section = "";
      return;
    }
    if (!inFrontMatter) return;
    if (/^\S/.test(line)) {
      section = line.replace(/:.*$/, "");
      return;
    }
    const key = /^ {2}([a-z0-9-]+):/.exec(line);
    if (!key || !section) return;
    if (!sections.has(section)) sections.set(section, new Set());
    sections.get(section).add(key[1]);
  });
  return sections;
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
  const theme = parseThemeTokens(`${read(TOKEN_FILES.generated)}\n${read(TOKEN_FILES.theme)}`);
  const sections = parseDesignFrontMatter(read(TOKEN_FILES.design));
  const tokens = {
    theme,
    colors: sections.get("colors") ?? new Set(),
    components: sections.get("components") ?? new Set(),
    names: new Set([...sections.values()].flatMap((names) => [...names])),
  };
  cache.set(root, tokens);
  return tokens;
}
