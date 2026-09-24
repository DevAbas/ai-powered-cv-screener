// Builds the CV index (PLAN, Indexer) in two steps:
//   profiles: for every PDF in `data/cvs`, text per page, one profile from
//             the `extract` entry, normalised, and the median job tenure,
//             written to data/index/<id>.json after every CV;
//   vectors:  one vector per indexed CV from the `embed` entry, in Pinecone.
// Both are resumable: what exists is kept unless forced.
//
//   npm run index                               both steps, for every CV not yet done
//   npm run index -- --only lena-novak,jane-doe a few CVs
//   npm run index -- --step vectors             only the vectors, e.g. after changing the embedding model
//   npm run index -- --force                    redo, e.g. after the PDFs changed
//   npm run index -- --dry-run                  the work list, no files, no calls

// ESM (see package.json here, which pdf.js needs): a CJS package has no named exports.
import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import type { IndexEntry } from "@/contracts/candidate";
import { missingApiKeys } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import { CandidateIdSchema } from "@/contracts/candidate";
import { indexEntryPath, readIndexEntries } from "@/lib/pool/index-files";
import { createEmbedder } from "@/lib/ai/embedder";
import { pineconeStoreFromEnv } from "@/lib/vector/pinecone";
import { PDFS_DIR, pdfPath, writeJsonAtomic } from "../generate/fs";
import { shortError, sleep } from "../generate/options";
import { extractProfile } from "./extract";
import { pdfPageTexts } from "./pdf-text";
import { medianTenureMonths, yearMonthOf } from "./tenure";
import { syncVectors } from "./vectors";

nextEnv.loadEnvConfig(process.cwd());

/** Pause between calls: OpenRouter's free tier allows 20 requests a minute. */
const PAUSE_MS = 3_500;

const STEPS = ["profiles", "vectors"] as const;
type Step = (typeof STEPS)[number];

function parseArgs(argv: string[]) {
  const known = new Set(["--only", "--step", "--force", "--dry-run"]);
  for (const arg of argv) {
    if (arg.startsWith("--") && !known.has(arg)) throw new Error(`Unknown flag ${arg}`);
  }
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined;
  };
  const steps = value("--step") ?? [...STEPS];
  const unknown = steps.filter((s) => !(STEPS as readonly string[]).includes(s));
  if (unknown.length) throw new Error(`Unknown step: ${unknown.join(", ")}. Expected one of: ${STEPS.join(", ")}`);
  return {
    only: value("--only"),
    steps: new Set(steps as Step[]),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
}

const log = (id: string, message: string) => console.log(`index ${id}: ${message}`);

function readIndex(): Map<string, IndexEntry> {
  let entries: IndexEntry[] = [];
  try {
    entries = readIndexEntries();
  } catch {
    // No index folder yet: the first run creates it.
  }
  return new Map(entries.map((e) => [e.id, e]));
}

async function writeEntry(entry: IndexEntry): Promise<void> {
  await writeJsonAtomic(indexEntryPath(entry.id), entry);
}

type Args = ReturnType<typeof parseArgs>;

interface Report {
  done: string[];
  skipped: string[];
  failed: string[];
}

function summary(step: Step, report: Report, dryRun: boolean): string {
  const verb = dryRun ? "would do" : "done";
  const failed = report.failed.length ? ` (${report.failed.join(", ")})` : "";
  return `${step}: ${verb} ${report.done.length}, skipped ${report.skipped.length}, failed ${report.failed.length}${failed}`;
}

/** Text per page and one extracted profile per CV, into data/index/<id>.json. */
async function runProfiles(args: Args, ids: readonly string[], index: Map<string, IndexEntry>): Promise<Report> {
  if (!args.dryRun) {
    const entry = getEntry("extract");
    const missing = missingApiKeys([entry.provider, ...(entry.fallback ? [entry.fallback.provider] : [])]);
    if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);
  }
  const report: Report = { done: [], skipped: [], failed: [] };
  let calls = 0;
  for (const id of ids) {
    if (args.only && !args.only.includes(id)) continue;
    if (!args.force && index.has(id)) {
      report.skipped.push(id);
      continue;
    }
    if (args.dryRun) {
      log(id, "would extract the profile");
      report.done.push(id);
      continue;
    }
    if (calls > 0) await sleep(PAUSE_MS);
    calls += 1;
    try {
      const text = await pdfPageTexts(new Uint8Array(await readFile(pdfPath(id))));
      const { profile, target, repaired } = await extractProfile(text, (message) => log(id, message));
      const entry: IndexEntry = {
        id,
        file: `/api/cvs/${id}`,
        pages: text.length,
        text,
        profile,
        medianTenureMonths: medianTenureMonths(profile.employment, yearMonthOf(new Date())),
      };
      index.set(id, entry);
      await writeEntry(entry);
      report.done.push(id);
      log(id, `indexed by ${target.model} (${text.length} page(s), ${profile.skills.length} skills, ${profile.employment.length} jobs${repaired ? ", repaired" : ""})`);
    } catch (error) {
      report.failed.push(id);
      log(id, `FAILED: ${shortError(error)}`);
    }
  }
  return report;
}

/** One vector per indexed CV in Pinecone; the index is created on first use. */
async function runVectors(args: Args, index: Map<string, IndexEntry>): Promise<Report> {
  const entries = [...index.values()];
  const wanted = entries.filter((entry) => !args.only || args.only.includes(entry.id));
  if (args.dryRun) {
    console.log(`vectors: would embed and store ${wanted.length} CV(s) not yet in Pinecone${args.force ? " (all, forced)" : ""}`);
    return { done: wanted.map((entry) => entry.id), skipped: [], failed: [] };
  }
  const embedEntry = getEntry("embed");
  const missing = missingApiKeys([embedEntry.provider]);
  if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);
  const embedder = createEmbedder(embedEntry);
  const store = pineconeStoreFromEnv(embedder.dimensions);
  await store.ensureIndex();
  const { done, skipped } = await syncVectors(entries, { embedder, store }, { only: args.only, force: args.force });
  for (const id of done) log(id, `vector stored (${embedEntry.model}, ${embedder.dimensions} dimensions)`);
  return { done, skipped, failed: [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = (await readdir(PDFS_DIR))
    .flatMap((file) => (file.endsWith(".pdf") ? [file.slice(0, -4)] : []))
    .filter((id) => CandidateIdSchema.safeParse(id).success)
    .sort();
  const unknown = args.only?.filter((id) => !ids.includes(id)) ?? [];
  if (unknown.length) throw new Error(`No CV for: ${unknown.join(", ")}`);

  const index = readIndex();
  const summaries: string[] = [];
  let failed = false;

  if (args.steps.has("profiles")) {
    console.log(`\n== profiles${args.dryRun ? " (dry run)" : ""} ==`);
    const report = await runProfiles(args, ids, index);
    summaries.push(summary("profiles", report, args.dryRun));
    failed ||= report.failed.length > 0;
  }
  if (args.steps.has("vectors")) {
    console.log(`\n== vectors${args.dryRun ? " (dry run)" : ""} ==`);
    try {
      summaries.push(summary("vectors", await runVectors(args, index), args.dryRun));
    } catch (error) {
      // Profiles already written are kept; the vectors step can be rerun on its own.
      summaries.push(`vectors: FAILED: ${shortError(error)}`);
      failed = true;
    }
  }

  console.log(`\n${summaries.join("\n")}`);
  if (failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
