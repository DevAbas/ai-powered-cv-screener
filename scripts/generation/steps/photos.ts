import { errorStatus, getEntry, withRetry } from "@/lib/models";
import { imageGenerator } from "@/lib/models/imageProviders";
import { exists, photoPath, writeFileAtomic } from "../paths";
import type { StepOptions, StepReport } from "../options";
import { log, shortError } from "../options";
import { PHOTO_SIZE, PHOTO_STEPS, photoCostLine, photoPrompt, photoSeed } from "../photoOptions";
import { ROSTER } from "../roster";
import { readSeeds } from "./seeds";

// Step 2: one photo per seed from the `image` slot, reproducible from a seed
// derived from the candidate id. Runs only when named: it calls a second
// service. A failed photo is reported, never fatal: the CV simply has no
// photo. A 429 that survives the retries is the day's allowance spent: the
// step stops there and leaves the rest for the next run.

const CALL_TIMEOUT_MS = 120_000;

export async function runPhotos(options: StepOptions): Promise<StepReport> {
  const report: StepReport = { step: "photos", done: [], skipped: [], failed: [] };
  const entry = getEntry("image");
  const seeds = await readSeeds();

  const todo: string[] = [];
  for (const { id } of ROSTER) {
    if (options.only && !options.only.includes(id)) continue;
    if (!seeds.has(id)) {
      log("photos", id, "no seed yet, skipped");
      report.skipped.push(id);
    } else if (!options.force && (await exists(photoPath(id)))) {
      report.skipped.push(id);
    } else {
      todo.push(id);
    }
  }
  console.log(`photos: ${photoCostLine(entry, todo.length)}`);
  if (options.dryRun) {
    report.done.push(...todo);
    return report;
  }

  const images = imageGenerator(entry);
  for (const [index, id] of todo.entries()) {
    const seed = seeds.get(id)!;
    try {
      const bytes = await withRetry(
        () =>
          images.generate(
            { prompt: photoPrompt(seed.photoPrompt), width: PHOTO_SIZE, height: PHOTO_SIZE, seed: photoSeed(id), steps: PHOTO_STEPS },
            AbortSignal.timeout(CALL_TIMEOUT_MS),
          ),
        {
          attempts: 3,
          onRetry: (error, attempt, delayMs) =>
            log("photos", id, `retry ${attempt} in ${Math.round(delayMs)} ms (${shortError(error)})`),
        },
      );
      await writeFileAtomic(photoPath(id), bytes);
      report.done.push(id);
      log("photos", id, `written (${Math.round(bytes.length / 1024)} KB)`);
    } catch (error) {
      report.failed.push(id);
      log("photos", id, `FAILED: ${shortError(error)}`);
      if (errorStatus(error) === 429) {
        const rest = todo.slice(index + 1);
        if (rest.length) {
          log("photos", "run", `the allowance is spent: ${rest.length} left for the next run`);
          report.skipped.push(...rest);
        }
        break;
      }
    }
  }
  return report;
}
