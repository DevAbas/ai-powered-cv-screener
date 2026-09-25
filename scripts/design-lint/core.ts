// Pure helpers for `npm run design:lint`: dark values
// live in src/styles/theme.css, so the dark theme is checked by substituting
// them into DESIGN.md and linting that document with the same rules.

export interface Issue {
  severity: "error" | "warning";
  message: string;
}

/** `--color-<role>` declarations inside the `@variant dark { … }` block of theme.css. */
export function parseDarkColors(css: string): Map<string, string> {
  const start = css.indexOf("@variant dark");
  if (start === -1) return new Map();
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === "{") depth++;
    else if (css[end] === "}" && --depth === 0) break;
  }
  const block = css.slice(open + 1, end);
  const colors = new Map<string, string>();
  for (const match of block.matchAll(/--color-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    colors.set(match[1], match[2].toUpperCase());
  }
  return colors;
}

/** Every light colour role needs a dark value, and every dark value a light role. */
export function checkCoverage(lightRoles: readonly string[], dark: ReadonlyMap<string, string>): Issue[] {
  const issues: Issue[] = [];
  for (const role of lightRoles) {
    if (!dark.has(role)) issues.push({ severity: "error", message: `Dark theme has no value for colors.${role}` });
  }
  for (const role of dark.keys()) {
    if (!lightRoles.includes(role)) {
      issues.push({ severity: "error", message: `Dark value --color-${role} has no colour role in DESIGN.md` });
    }
  }
  return issues;
}

/**
 * DESIGN.md with each `colors:` value in the front matter replaced by its dark
 * value. Roles without a dark value keep the light one (coverage reports them).
 */
export function withDarkColors(designMd: string, dark: ReadonlyMap<string, string>): string {
  const lines = designMd.split("\n");
  let inFrontMatter = false;
  let inColors = false;
  return lines
    .map((line, i) => {
      if (line === "---") {
        inFrontMatter = i === 0;
        inColors = false;
        return line;
      }
      if (!inFrontMatter) return line;
      if (/^\S/.test(line)) {
        inColors = line.startsWith("colors:");
        return line;
      }
      if (!inColors) return line;
      const match = /^(\s+)([a-z0-9-]+):\s*"?#[0-9a-fA-F]{3,8}"?\s*$/.exec(line);
      const value = match && dark.get(match[2]);
      return value ? `${match[1]}${match[2]}: "${value}"` : line;
    })
    .join("\n");
}
