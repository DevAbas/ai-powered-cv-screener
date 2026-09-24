import { readdir } from "node:fs/promises";
import type { CandidateSeed } from "@/contracts/candidate";
import { CandidateSeedSchema } from "@/contracts/candidate";
import { languageModel } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import type { ModelEntry, ModelTarget } from "@/lib/ai/registry";
import { isDailyQuotaError, withRetry } from "@/lib/ai/retry";
import type { RetryOptions } from "@/lib/ai/retry";
import { generateWithRepair } from "@/lib/ai/structured";
import type { StructuredRequest, StructuredResult } from "@/lib/ai/structured";
import { exists, readJson, SEEDS_DIR, seedPath, writeJsonAtomic } from "./fs";
import type { StepOptions, StepReport } from "./options";
import { log, shortError, sleep } from "./options";
import { ROSTER } from "./roster";
import { assembleSeed, findDuplicateEmployment, seedRequest } from "./seed";

// Step 1: one seed per roster entry, written by the `generate` model
// (PLAN, Generation pipeline). Resumable: an existing seed is kept unless
// forced.

/** Pause between calls: OpenRouter's free tier allows 20 requests a minute. */
const PAUSE_MS = 3_500;
const CALL_TIMEOUT_MS = 120_000;
/** Patient backoff per model: an overloaded free model and a per-minute limit both clear within this. */
const RETRY: RetryOptions = { attempts: 4, baseMs: 5_000, maxMs: 60_000 };

/** When each free tier's daily quota resets, for the message when every model is used up. */
const QUOTA_RESETS = "OpenRouter free models reset at 00:00 UTC, the Gemini free tier at 07:00 UTC";

/** Every seed on disk, in roster order. */
export async function readSeeds(): Promise<Map<string, CandidateSeed>> {
  const seeds = new Map<string, CandidateSeed>();
  if (!(await exists(SEEDS_DIR))) return seeds;
  const files = new Set(await readdir(SEEDS_DIR));
  for (const { id } of ROSTER) {
    if (!files.has(`${id}.json`)) continue;
    seeds.set(id, CandidateSeedSchema.parse(await readJson(seedPath(id))));
  }
  return seeds;
}

/** Every model that could write a seed has hit a quota that patience does not clear. */
class QuotaExhaustedError extends Error {
  constructor(models: Iterable<string>) {
    super(`every model's quota is used up for today (${[...models].join(", ")})`);
    this.name = "QuotaExhaustedError";
  }
}

/**
 * One seed from the entry's model, then its fallback, each with the
 * script's patient backoff. A model whose daily quota is gone, or that
 * still answers 429 after the backoff, is skipped for the rest of the run.
 */
async function generateSeed<T>(
  entry: ModelEntry,
  exhausted: Set<string>,
  id: string,
  request: StructuredRequest<T>,
): Promise<StructuredResult<T> & { target: ModelTarget }> {
  const targets = [entry, ...(entry.fallback ? [entry.fallback] : [])].filter((t) => !exhausted.has(t.model));
  if (targets.length === 0) throw new QuotaExhaustedError(exhausted);
  for (const [i, target] of targets.entries()) {
    try {
      const result = await withRetry(
        () => generateWithRepair(languageModel(target), request, { signal: AbortSignal.timeout(CALL_TIMEOUT_MS) }),
        {
          ...RETRY,
          onRetry: (error, attempt, delayMs) =>
            log("seeds", id, `${target.model}: retry ${attempt} in ${Math.round(delayMs / 1000)} s (${shortError(error)})`),
        },
      );
      return { ...result, target };
    } catch (error) {
      const quota = isDailyQuotaError(error) || /quota/i.test(shortError(error));
      if (quota) {
        exhausted.add(target.model);
        log("seeds", id, `${target.model}: quota used up, skipping it for the rest of the run`);
      } else {
        log("seeds", id, `${target.model} failed (${shortError(error)})`);
      }
      if (i === targets.length - 1) {
        if (targets.every((t) => exhausted.has(t.model))) throw new QuotaExhaustedError(exhausted);
        throw error;
      }
    }
  }
  throw new Error("unreachable");
}

export async function runSeeds(options: StepOptions): Promise<StepReport> {
  const report: StepReport = { step: "seeds", done: [], skipped: [], failed: [] };
  const entry = getEntry("generate");
  const exhausted = new Set<string>();
  const seeds = await readSeeds();
  const usedCompanies = new Set([...seeds.values()].flatMap((s) => s.employment.map((j) => j.company)));
  let calls = 0;

  for (const [index, roster] of ROSTER.entries()) {
    if (options.only && !options.only.includes(roster.id)) continue;
    if (!options.force && seeds.has(roster.id)) {
      report.skipped.push(roster.id);
      continue;
    }
    if (options.dryRun) {
      log("seeds", roster.id, "would generate");
      report.done.push(roster.id);
      continue;
    }
    if (calls > 0) await sleep(PAUSE_MS);
    calls += 1;
    try {
      const { output, repaired, target } = await generateSeed(entry, exhausted, roster.id, {
        ...seedRequest(roster, [...usedCompanies]),
        onRepair: (issues) => log("seeds", roster.id, `schema failure, repairing:\n${issues}`),
      });
      const seed = assembleSeed(roster, index, output);
      await writeJsonAtomic(seedPath(roster.id), seed);
      seeds.set(roster.id, seed);
      for (const job of seed.employment) usedCompanies.add(job.company);
      report.done.push(roster.id);
      log("seeds", roster.id, `written by ${target.model} (${seed.employment.length} jobs, ${seed.skills.length} skills${repaired ? ", repaired" : ""})`);
    } catch (error) {
      report.failed.push(roster.id);
      log("seeds", roster.id, `FAILED: ${shortError(error)}`);
      if (error instanceof QuotaExhaustedError) {
        console.log(`seeds: stopping, ${error.message}. Rerun later; existing seeds are kept (${QUOTA_RESETS}).`);
        break;
      }
    }
  }

  const ids = [...seeds.keys()];
  for (const group of findDuplicateEmployment(ids.map((id) => seeds.get(id)!), ids)) {
    console.log(`seeds: identical employment history: ${group.join(", ")}`);
  }
  return report;
}
