import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LENA, TEST_INDEX } from "@/mocks/sampleIndex";
import { CVS_DIR, parseIndexEntry, readIndexEntries, resolveCv } from "../indexFiles";

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "index-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("parseIndexEntry", () => {
  it("returns a valid entry", () => {
    expect(parseIndexEntry("lena-novak.json", JSON.stringify(LENA))).toEqual(LENA);
  });

  it("names the file in every failure", () => {
    expect(() => parseIndexEntry("lena-novak.json", "{")).toThrow(/data\/index\/lena-novak\.json is not JSON/);
    expect(() => parseIndexEntry("lena-novak.json", JSON.stringify({ ...LENA, pages: 0 }))).toThrow(/lena-novak\.json fails the index contract: pages/);
    expect(() => parseIndexEntry("someone-else.json", JSON.stringify(LENA))).toThrow(/holds the entry of "lena-novak"/);
  });
});

describe("readIndexEntries", () => {
  it("reads every file, sorted by id, and ignores other files", () => {
    const dir = tempDir();
    for (const entry of [...TEST_INDEX].reverse()) writeFileSync(path.join(dir, `${entry.id}.json`), JSON.stringify(entry));
    writeFileSync(path.join(dir, "notes.txt"), "not an entry");
    expect(readIndexEntries(dir).map((entry) => entry.id)).toEqual(["andrei-popescu", "elena-georgiou", "lena-novak"]);
  });

  it("says how to build a missing index", () => {
    expect(() => readIndexEntries(path.join(tempDir(), "missing"))).toThrow(/Run npm run index/);
  });
});

describe("resolveCv", () => {
  const byId = new Map(TEST_INDEX.map((entry) => [entry.id, entry]));

  it("resolves an indexed id to its file under data/cvs and its download name", () => {
    expect(resolveCv(byId, "lena-novak")).toEqual({ file: path.join(CVS_DIR, "lena-novak.pdf"), fileName: "lena_novak_cv.pdf" });
  });

  it("refuses ids that are not in the index, before touching any path", () => {
    expect(resolveCv(byId, "nobody")).toBeUndefined();
    expect(resolveCv(byId, "../lena-novak")).toBeUndefined();
    expect(resolveCv(byId, "")).toBeUndefined();
    expect(resolveCv(byId, "lena-novak.pdf")).toBeUndefined();
  });
});
