import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// App code never reads the generation data (PLAN, Data layout). The lint
// rule catches imports; this catches paths written as strings.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? files(file) : /\.(ts|tsx|mts)$/.test(name) && !name.endsWith(".test.ts") ? [file] : [];
  });
}

describe("data boundary", () => {
  it("keeps data/generation out of src", () => {
    const offenders = files(path.join(process.cwd(), "src")).filter((file) => readFileSync(file, "utf8").includes("data/generation"));
    expect(offenders).toEqual([]);
  });
});
