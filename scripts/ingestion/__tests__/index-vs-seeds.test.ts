import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEX_DIR, readIndexEntries } from "@/lib/pool/index-files";
import { readSeeds } from "../../generation/steps/seeds";
import { accuracyReport, compareEntry, COMPARED_FIELDS } from "../accuracy";

// The committed index checked against the seeds its PDFs were rendered from
// (PLAN, Indexer): every fact the PDF prints, and the accuracy thresholds.

const index = existsSync(INDEX_DIR) ? readIndexEntries() : [];
const seeds = await readSeeds();
const seeded = index.filter((entry) => seeds.has(entry.id));

describe.runIf(seeded.length > 0)("index against seeds", () => {
  it.each(seeded.map((entry) => [entry.id, entry] as const))("%s matches its seed", (_id, entry) => {
    const result = compareEntry(entry, seeds.get(entry.id)!);
    expect(COMPARED_FIELDS.filter((field) => !result[field])).toEqual([]);
    expect(entry.pages).toBeGreaterThan(0);
  });

  it("meets the accuracy thresholds", () => {
    const report = accuracyReport(seeded, seeds);
    expect(report.mismatches).toEqual([]);
    expect(report.passes).toBe(true);
  });
});
