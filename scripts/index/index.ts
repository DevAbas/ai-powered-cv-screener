// Builds the CV index (PLAN, Indexer): for every PDF in `public/cvs`, text
// per page, one profile from the `extract` entry, normalised, and the median
// job tenure. Resumable: an indexed CV is kept unless forced; the index is
// written after every CV.
//
//   npm run index                               every CV not yet indexed
//   npm run index -- --only lena-novak,jane-doe a few CVs
//   npm run index -- --force                    re-index, e.g. after the PDFs changed
//   npm run index -- --dry-run                  the work list, no files, no calls

// ESM (see package.json here, which pdf.js needs): a CJS package has no named exports.
import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import type { IndexEntry } from "@/contracts/candidate";
import { missingApiKeys } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import { INDEX_FILE, IndexSchema } from "@/lib/pool/index-file";
import { cvFileName, cvIdFromFileName } from "@/lib/pool/source-href";
import { exists, PDFS_DIR, pdfPath, readJson, writeJsonAtomic } from "../generate/fs";
import { shortError, sleep } from "../generate/options";
import { extractProfile } from "./extract";
import { pdfPageTexts } from "./pdf-text";
import { medianTenureMonths, yearMonthOf } from "./tenure";

nextEnv.loadEnvConfig(process.cwd());

/** Pause between calls: OpenRouter's free tier allows 20 requests a minute. */
const PAUSE_MS = 3_500;

function parseArgs(argv: string[]) {
  const known = new Set(["--only", "--force", "--dry-run"]);
  for (const arg of argv) {
    if (arg.startsWith("--") && !known.has(arg)) throw new Error(`Unknown flag ${arg}`);
  }
  const i = argv.indexOf("--only");
  return {
    only: i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined,
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
}

const log = (id: string, message: string) => console.log(`index ${id}: ${message}`);

async function readIndex(): Promise<Map<string, IndexEntry>> {
  const entries = (await exists(INDEX_FILE)) ? IndexSchema.parse(await readJson(INDEX_FILE)) : [];
  return new Map(entries.map((e) => [e.id, e]));
}

async function writeIndex(index: Map<string, IndexEntry>): Promise<void> {
  await writeJsonAtomic(INDEX_FILE, [...index.values()].sort((a, b) => a.id.localeCompare(b.id)));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = (await readdir(PDFS_DIR)).flatMap((file) => cvIdFromFileName(file) ?? []).sort();
  const unknown = args.only?.filter((id) => !ids.includes(id)) ?? [];
  if (unknown.length) throw new Error(`No CV for: ${unknown.join(", ")}`);

  if (!args.dryRun) {
    const entry = getEntry("extract");
    const missing = missingApiKeys([entry.provider, ...(entry.fallback ? [entry.fallback.provider] : [])]);
    if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);
  }

  const index = await readIndex();
  const report = { done: [] as string[], skipped: [] as string[], failed: [] as string[] };
  let calls = 0;

  for (const id of ids) {
    if (args.only && !args.only.includes(id)) continue;
    if (!args.force && index.has(id)) {
      report.skipped.push(id);
      continue;
    }
    if (args.dryRun) {
      log(id, "would index");
      report.done.push(id);
      continue;
    }
    if (calls > 0) await sleep(PAUSE_MS);
    calls += 1;
    try {
      const text = await pdfPageTexts(new Uint8Array(await readFile(pdfPath(id))));
      const { profile, target, repaired } = await extractProfile(text, (message) => log(id, message));
      index.set(id, {
        id,
        file: `/cvs/${cvFileName(id)}`,
        pages: text.length,
        text,
        profile,
        medianTenureMonths: medianTenureMonths(profile.employment, yearMonthOf(new Date())),
      });
      await writeIndex(index);
      report.done.push(id);
      log(id, `indexed by ${target.model} (${text.length} page(s), ${profile.skills.length} skills, ${profile.employment.length} jobs${repaired ? ", repaired" : ""})`);
    } catch (error) {
      report.failed.push(id);
      log(id, `FAILED: ${shortError(error)}`);
    }
  }

  const verb = args.dryRun ? "would index" : "indexed";
  console.log(`\nindex: ${verb} ${report.done.length}, skipped ${report.skipped.length}, failed ${report.failed.length}${report.failed.length ? ` (${report.failed.join(", ")})` : ""}`);
  if (report.failed.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
