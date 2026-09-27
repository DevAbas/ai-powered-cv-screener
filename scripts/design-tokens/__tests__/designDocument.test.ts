import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import { componentsContract, contractProblems, lintDocument, proseProblems } from "../designDocument";
import type { TokenSource } from "../tokenSource";
import { readTokenSource, RESOLVER_PATH } from "../tokenSource";

const designMd = readFileSync("DESIGN.md", "utf8");
let source: TokenSource;

beforeAll(async () => {
  source = await readTokenSource();
});

describe("contractProblems", () => {
  it("passes the repository's DESIGN.md: no values, the tokens imported, a contract on roles", () => {
    expect(contractProblems(designMd, source, RESOLVER_PATH)).toEqual([]);
    expect(componentsContract(designMd)["button-primary"]).toEqual({ backgroundColor: "{color.primary}", textColor: "{color.on-primary}", typography: "{typography.label-md}", rounded: "{rounded.full}" });
  });

  it("refuses values in DESIGN.md, and an import of anything but the tokens", () => {
    const broken = designMd.replace("imports: ./design-system/tokens/design.resolver.json", 'imports: ./tokens.json\ncolors:\n  primary: "#00F3BB"');
    expect(contractProblems(broken, source, RESOLVER_PATH)).toEqual([
      "DESIGN.md's front matter holds `colors:`: values live in the design tokens it imports, DESIGN.md holds rules",
      "DESIGN.md imports ./tokens.json: it imports the design tokens at ./design-system/tokens/design.resolver.json",
    ]);
  });

  it("refuses a component that states a value, reads the palette, or names a token that does not exist", () => {
    const broken = designMd.replace(
      '  page:\n    backgroundColor: "{color.surface}"\n    textColor: "{color.on-surface}"',
      '  page:\n    backgroundColor: "{palette.mint-9}"\n    textColor: "{color.ink}"\n    rounded: "#FFFFFF"',
    );
    const problems = contractProblems(broken, source, RESOLVER_PATH);
    expect(problems).toContain("components.page.backgroundColor reads the palette entry mint-9: components read roles");
    expect(problems).toContain("components.page.textColor names {color.ink}, which the tokens do not define");
    expect(problems).toContain("components.page.rounded is #FFFFFF: a component names a token (`{color.…}`), it does not state a value");
  });
});

describe("proseProblems", () => {
  it("passes the repository's DESIGN.md: every token id its prose names exists", () => {
    expect(proseProblems(designMd, source)).toEqual([]);
  });

  it("refuses a prose id in a token group that the tokens do not define, and leaves other code spans alone", () => {
    const broken = designMd.replace("default or `dark`. So `color.surface` is found in", "default or `dark`. So `color.ink` is found in `{rounded.huge}`, `typewriter.ts`,");
    const line = broken.split("\n").findIndex((l) => l.includes("`color.ink`")) + 1;
    expect(proseProblems(broken, source)).toEqual([
      `DESIGN.md line ${line} names \`color.ink\`, which the tokens do not define`,
      `DESIGN.md line ${line} names \`{rounded.huge}\`, which the tokens do not define`,
    ]);
    expect(contractProblems(broken, source, RESOLVER_PATH)).toHaveLength(2);
  });
});

describe("lintDocument", () => {
  it("composes the format's document from one theme's tokens and the contract, for the linter only", () => {
    const light = parse(lintDocument(designMd, source, "light").split("\n---\n")[0].replace(/^---\n/, "")) as Record<string, Record<string, unknown>>;
    expect(light.colors["mint-9"]).toBe("#00F3BB");
    expect(light.colors.primary).toBe("{colors.mint-9}");
    expect((light.components["button-primary"] as Record<string, string>).backgroundColor).toBe("{colors.primary}");
    expect((light.typography["headline-lg"] as Record<string, string>).letterSpacing).toBe("-0.01em");

    const dark = parse(lintDocument(designMd, source, "dark").split("\n---\n")[0].replace(/^---\n/, "")) as Record<string, Record<string, unknown>>;
    expect(dark.colors.primary).toBe("#00FFC6");
  });
});
