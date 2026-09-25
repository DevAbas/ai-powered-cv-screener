// Generates the pilot pool (PLAN, Generation pipeline): seeds, photos and
// PDFs for the fixed roster. Every step skips what exists and can be forced.
//
//   npm run generate                                   seeds and pdfs (photos are paid: only when named)
//   npm run generate -- --step photos                  the paid photo step
//   npm run generate -- --step pdfs --force            re-render every PDF, e.g. after photos arrived
//   npm run generate -- --only lena-novak,jane-doe     a few candidates
//   npm run generate -- --dry-run                      the work list, no files, no calls

// ESM (see package.json here, which react-pdf needs): a CJS package has no named exports.
import nextEnv from "@next/env";
import { missingApiKeys } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import type { Provider } from "@/lib/ai/registry";
import type { Step, StepOptions, StepReport } from "./options";
import { STEPS } from "./options";
import { runPdfs } from "./steps/pdfs";
import { runPhotos } from "./steps/photos";
import { ROSTER } from "./roster";
import { runSeeds } from "./steps/seeds";

nextEnv.loadEnvConfig(process.cwd());

const DEFAULT_STEPS: readonly Step[] = ["seeds", "pdfs"];

function parseArgs(argv: string[]) {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? (argv[i + 1] ?? "").split(",").filter(Boolean) : undefined;
  };
  const known = new Set(["--step", "--only", "--force", "--dry-run"]);
  for (const arg of argv) {
    if (arg.startsWith("--") && !known.has(arg)) throw new Error(`Unknown flag ${arg}`);
  }
  return {
    steps: value("--step") ?? DEFAULT_STEPS,
    only: value("--only"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
}

function assertKnown(kind: string, values: readonly string[], known: readonly string[]) {
  const unknown = values.filter((v) => !known.includes(v));
  if (unknown.length) throw new Error(`Unknown ${kind}: ${unknown.join(", ")}. Expected one of: ${known.join(", ")}`);
}

/** Providers a step calls, so a missing key fails before any work. */
function providersFor(step: Step): Provider[] {
  switch (step) {
    case "seeds": {
      const entry = getEntry("generate");
      return [entry.provider, ...(entry.fallback ? [entry.fallback.provider] : [])];
    }
    case "photos":
      return [getEntry("image").provider];
    case "pdfs":
      return [];
  }
}

const RUNNERS: Record<Step, (options: StepOptions) => Promise<StepReport>> = {
  seeds: runSeeds,
  photos: runPhotos,
  pdfs: runPdfs,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  assertKnown("step", args.steps, STEPS);
  if (args.only) assertKnown("candidate id", args.only, ROSTER.map((c) => c.id));
  const steps = STEPS.filter((s) => args.steps.includes(s));
  const options: StepOptions = { only: args.only, force: args.force, dryRun: args.dryRun };

  if (!args.dryRun) {
    const missing = missingApiKeys(steps.flatMap(providersFor));
    if (missing.length) throw new Error(`Set ${missing.join(" and ")} in .env.local (see .env.example).`);
  }

  const reports: StepReport[] = [];
  for (const step of steps) {
    console.log(`\n== ${step}${args.dryRun ? " (dry run)" : ""} ==`);
    reports.push(await RUNNERS[step](options));
  }

  console.log("");
  for (const r of reports) {
    const verb = args.dryRun ? "would generate" : "generated";
    console.log(`${r.step}: ${verb} ${r.done.length}, skipped ${r.skipped.length}, failed ${r.failed.length}${r.failed.length ? ` (${r.failed.join(", ")})` : ""}`);
  }
  // A missing photo is never fatal (PLAN, Generation pipeline).
  if (reports.some((r) => r.step !== "photos" && r.failed.length)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
