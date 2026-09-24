import { generateText } from "ai";
import { languageModel } from "@/lib/ai/providers";
import { getEntry } from "@/lib/ai/registry";
import { withRetry } from "@/lib/ai/retry";
import { exists, photoPath, writeFileAtomic } from "./fs";
import type { StepOptions, StepReport } from "./options";
import { log, shortError } from "./options";
import { PHOTO_COST_USD, PHOTO_MEDIA_TYPE, photoPrompt, photoProviderOptions } from "./photo-options";
import { ROSTER } from "./roster";
import { readSeeds } from "./seeds";

// Step 2: one photo per seed from the paid `image` entry (PLAN, Generation
// pipeline). Runs only when named. A failed photo is reported, never fatal:
// the PDF shows initials instead.

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
  console.log(`photos: ${todo.length} call(s) to ${entry.model} (${entry.tier}), about $${(todo.length * PHOTO_COST_USD).toFixed(2)}`);
  if (options.dryRun) {
    report.done.push(...todo);
    return report;
  }

  for (const id of todo) {
    const seed = seeds.get(id)!;
    try {
      const result = await withRetry(
        () =>
          generateText({
            model: languageModel(entry),
            prompt: photoPrompt(seed.photoPrompt),
            providerOptions: photoProviderOptions(),
            maxRetries: 0,
            abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          }),
        {
          attempts: 3,
          onRetry: (error, attempt, delayMs) =>
            log("photos", id, `retry ${attempt} in ${Math.round(delayMs)} ms (${shortError(error)})`),
        },
      );
      const image = result.files.find((file) => file.mediaType === PHOTO_MEDIA_TYPE);
      if (!image) {
        const types = result.files.map((f) => f.mediaType).join(", ") || "none";
        throw new Error(`no ${PHOTO_MEDIA_TYPE} returned (files: ${types}; finishReason: ${result.finishReason})`);
      }
      await writeFileAtomic(photoPath(id), image.uint8Array);
      report.done.push(id);
      log("photos", id, `written (${Math.round(image.uint8Array.length / 1024)} KB)`);
    } catch (error) {
      report.failed.push(id);
      log("photos", id, `FAILED: ${shortError(error)}`);
    }
  }
  return report;
}
