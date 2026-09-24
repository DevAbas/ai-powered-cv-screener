// Builds the CV index (PLAN, Indexer) in three steps:
//   profiles: for every PDF in `data/cvs`, the text per page split into
//             section chunks, one profile from the `extract` entry, verified
//             against the text, written to data/index/<id>.json after every CV;
//   sources:  the same without the model: chunks and sources rebuilt from the
//             PDF and the profile already indexed (after a change to the
//             section rules or the verification);
//   vectors:  one vector per chunk from the `embed` entry, in Pinecone.
// All are resumable: what exists is kept unless forced.
//
//   npm run index                               profiles and vectors, for every CV not yet done
//   npm run index -- --only lena-novak,jane-doe a few CVs
//   npm run index -- --step vectors --force     redo every vector, e.g. after changing the embedding model
//   npm run index -- --step sources             rebuild chunks and sources, no model call
//   npm run index -- --check                    extraction accuracy against the seeds
//   npm run index -- --dry-run                  the work list, no files, no calls

// ESM (see package.json here, which pdf.js needs): a CJS package has no named exports.
import nextEnv from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import type { IndexEntry } from "@/contracts/candidate";
import { CandidateIdSchema, CandidateProfileSchema } from "@/contracts/candidate";
import { z } from "zod";
import { createEmbedder } from "@/lib/ai/embedder";
import { missingApiKeys } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import { buildIndexEntry } from "@/lib/pool/build-entry";
import { indexEntryPath, INDEX_DIR, readIndexEntries } from "@/lib/pool/index-files";
import { pineconeStoreFromEnv } from "@/lib/vector/pinecone";
import { PDFS_DIR, pdfPath, readJson, writeJsonAtomic } from "../generate/fs";
import { shortError, sleep } from "../generate/options";
import { readSeeds } from "../generate/seeds";
import { accuracyReport, formatAccuracy } from "./accuracy";
import { extractProfile } from "./extract";
import { pdfPageTexts } from "./pdf-text";
import { syncVectors } from "./vectors";

nextEnv.loadEnvConfig(process.cwd());

/** Pause between calls: OpenRouter's free tier allows 20 requests a minute. */
const PAUSE_MS = 3_500;

const STEPS = ["profiles", "sources", "vectors"] as const;
type Step = (typeof STEPS)[number];
const DEFAULT_STEPS: readonly Step[] = ["profiles", "vectors"];

function parseArgs(argv: string[]) {
  const known = new Set(["--only", "--step", "--force", "--dry-run", "--check"]);
  for (const arg of argv) {
    if (arg.startsWith("--") && !known.has(arg)) throw new Error(`Unknown flag ${arg}`);
  }
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined;
  };
  const steps = value("--step") ?? [...DEFAULT_STEPS];
  const unknown = steps.filter((s) => !(STEPS as readonly string[]).includes(s));
  if (unknown.length) throw new Error(`Unknown step: ${unknown.join(", ")}. Expected one of: ${STEPS.join(", ")}`);
  return {
    only: value("--only"),
    steps: new Set(steps as Step[]),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
    check: argv.includes("--check"),
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

/** Section chunks and one extracted, verified profile per CV, into data/index/<id>.json. */
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
      const pages = await pdfPageTexts(new Uint8Array(await readFile(pdfPath(id))));
      const chunks = buildIndexEntry(id, pages, index.get(id)?.profile ?? PLACEHOLDER_PROFILE).entry.chunks;
      const { profile, evidence, target, repaired } = await extractProfile(chunks, (message) => log(id, message));
      const { entry, unverified } = buildIndexEntry(id, pages, profile, evidence);
      index.set(id, entry);
      await writeEntry(entry);
      report.done.push(id);
      log(
        id,
        `indexed by ${target.model} (${pages.length} page(s), ${entry.chunks.length} chunks, ${profile.skills.length} skills, ${profile.employment.length} jobs${repaired ? ", repaired" : ""}${unverified.length ? `; not found in the text: ${unverified.join(", ")}` : ""})`,
      );
    } catch (error) {
      report.failed.push(id);
      log(id, `FAILED: ${shortError(error)}`);
    }
  }
  return report;
}

/** An empty profile, only to split a CV into chunks before its profile exists. */
const PLACEHOLDER_PROFILE = CandidateProfileSchema.parse({
  name: "-",
  headline: "-",
  role: "other",
  seniority: "mid",
  location: "-",
  remote: ["remote"],
  workAuthorization: "-",
  availability: 0,
  yearsTotal: 0,
  skills: [],
  languages: [],
  education: [],
  employment: [],
  leadership: { has: false, note: "" },
  certifications: [],
});

/** The profile already indexed for a CV, whatever else its file holds. */
const IndexedProfileSchema = z.object({ id: CandidateIdSchema, profile: CandidateProfileSchema });

/** Chunks and sources rebuilt from each PDF and its indexed profile; no model call. */
async function runSources(args: Args, ids: readonly string[], index: Map<string, IndexEntry>): Promise<Report> {
  const report: Report = { done: [], skipped: [], failed: [] };
  for (const id of ids) {
    if (args.only && !args.only.includes(id)) continue;
    let indexed: z.infer<typeof IndexedProfileSchema>;
    try {
      indexed = IndexedProfileSchema.parse(await readJson(indexEntryPath(id)));
    } catch {
      log(id, "no indexed profile yet, skipped");
      report.skipped.push(id);
      continue;
    }
    if (args.dryRun) {
      log(id, "would rebuild the chunks and sources");
      report.done.push(id);
      continue;
    }
    try {
      const pages = await pdfPageTexts(new Uint8Array(await readFile(pdfPath(id))));
      const { entry, unverified } = buildIndexEntry(id, pages, indexed.profile);
      index.set(id, entry);
      await writeEntry(entry);
      report.done.push(id);
      log(id, `${entry.chunks.length} chunks, ${Object.keys(entry.sources).length} sources${unverified.length ? `; not found in the text: ${unverified.join(", ")}` : ""}`);
    } catch (error) {
      report.failed.push(id);
      log(id, `FAILED: ${shortError(error)}`);
    }
  }
  return report;
}

/** One vector per chunk in Pinecone; the index is created on first use. */
async function runVectors(args: Args, index: Map<string, IndexEntry>): Promise<Report> {
  const entries = [...index.values()];
  const wanted = entries.filter((entry) => !args.only || args.only.includes(entry.id));
  if (args.dryRun) {
    const chunks = wanted.reduce((n, entry) => n + entry.chunks.length, 0);
    console.log(`vectors: would embed and store ${chunks} chunk(s) of ${wanted.length} CV(s) not yet in Pinecone${args.force ? " (all, forced)" : ""}`);
    return { done: wanted.map((entry) => entry.id), skipped: [], failed: [] };
  }
  const embedEntry = getEntry("embed");
  const missing = missingApiKeys([embedEntry.provider]);
  if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);
  const embedder = createEmbedder(embedEntry);
  const store = pineconeStoreFromEnv(embedder.dimensions);
  await store.ensureIndex();
  if (args.force && !args.only) await store.deleteAll();
  const { done, skipped } = await syncVectors(entries, { embedder, store }, { only: args.only, force: args.force });
  for (const id of done) log(id, `vectors stored (${embedEntry.model}, ${embedder.dimensions} dimensions)`);
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

  if (args.check) {
    const report = accuracyReport(readIndexEntries(INDEX_DIR), await readSeeds());
    console.log(formatAccuracy(report));
    if (!report.passes) process.exitCode = 1;
    return;
  }

  const index = readIndex();
  const summaries: string[] = [];
  let failed = false;

  if (args.steps.has("profiles")) {
    console.log(`\n== profiles${args.dryRun ? " (dry run)" : ""} ==`);
    const report = await runProfiles(args, ids, index);
    summaries.push(summary("profiles", report, args.dryRun));
    failed ||= report.failed.length > 0;
  }
  if (args.steps.has("sources")) {
    console.log(`\n== sources${args.dryRun ? " (dry run)" : ""} ==`);
    const report = await runSources(args, ids, index);
    summaries.push(summary("sources", report, args.dryRun));
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
