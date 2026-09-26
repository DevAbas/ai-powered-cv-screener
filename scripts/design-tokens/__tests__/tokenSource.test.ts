import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readTokenSource, TokenSourceError } from "../tokenSource";

// The rules run on a copy of the real tokens, broken one way per case.

const copies: string[] = [];

/** A copy of tokens/ with `edit` applied to one file's JSON. */
function brokenCopy(file: string, edit: (json: Record<string, Record<string, Record<string, unknown>>>) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "tokens-"));
  copies.push(dir);
  cpSync("tokens", join(dir, "tokens"), { recursive: true });
  const path = join(dir, "tokens", file);
  const json = JSON.parse(readFileSync(path, "utf8"));
  edit(json);
  writeFileSync(path, JSON.stringify(json));
  return dir;
}

async function problemsOf(dir: string): Promise<readonly string[]> {
  try {
    await readTokenSource(dir);
    return [];
  } catch (error) {
    if (error instanceof TokenSourceError) return error.problems;
    throw error;
  }
}

afterEach(() => {
  for (const dir of copies.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("readTokenSource", () => {
  it("reads the repository's tokens in their tiers", async () => {
    const source = await readTokenSource();
    expect(source.roles.light.get("primary")).toEqual({ kind: "palette", palette: "mint-9", hex: "#00f3bb" });
    expect(source.roles.dark.get("primary")).toMatchObject({ kind: "palette", palette: "mint-dark-9" });
    expect(source.roles.dark.get("primary-hover")).toMatchObject({ kind: "derived", rule: { kind: "lightness", from: "primary", lightness: -0.07 } });
    expect(source.roles.light.size).toBe(source.roles.dark.size);
    expect(source.typography.get("headline-lg")?.letterSpacing).toEqual({ value: -0.01375, unit: "rem" });
    // Authored order, not alphabetical: the palette file starts with white.
    expect([...source.palette.keys()][0]).toBe("white");
  });

  it("refuses an alias in the palette", async () => {
    const dir = brokenCopy("foundation/colors.tokens.json", (json) => {
      json.palette.white = { $value: "{palette.gray-1}" };
    });
    expect(await problemsOf(dir)).toContainEqual(expect.stringContaining("palette.white is an alias of palette.gray-1"));
  });

  it("refuses a role that is a literal without a rule, or points to another role", async () => {
    const dir = brokenCopy("themes/light.tokens.json", (json) => {
      json.color.surface = { $value: { colorSpace: "srgb", components: [1, 1, 1], hex: "#ffffff" } };
      json.color.outline = { $value: "{color.surface-container-low}" };
    });
    const problems = await problemsOf(dir);
    expect(problems).toContainEqual(expect.stringContaining("light: color.surface is a literal"));
    expect(problems).toContainEqual(expect.stringContaining("light: color.outline points to color.surface-container-low"));
  });

  it("refuses a derived value its rule does not give", async () => {
    const dir = brokenCopy("themes/dark.tokens.json", (json) => {
      (json.color["primary-hover"] as { $value: unknown }).$value = { colorSpace: "srgb", components: [0, 0.9, 0.7], hex: "#00e6b3" };
    });
    expect(await problemsOf(dir)).toContainEqual("dark: color.primary-hover is #00e6b3, but its rule gives #00e5b1");
  });

  it("refuses a role one theme does not define", async () => {
    const dir = brokenCopy("themes/dark.tokens.json", (json) => {
      delete json.color.warning;
    });
    expect(await problemsOf(dir)).toContainEqual("color.warning is defined in light only");
  });

  it("refuses a text style that states its family or weight instead of pointing to the foundation", async () => {
    const dir = brokenCopy("semantic/typography.tokens.json", (json) => {
      (json.typography["body-md"] as { $value: { fontWeight: unknown } }).$value.fontWeight = 400;
    });
    expect(await problemsOf(dir)).toContainEqual(expect.stringContaining("typography.body-md.fontWeight is a literal"));
  });
});
