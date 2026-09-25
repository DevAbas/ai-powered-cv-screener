import type { ModelEntry } from "@/lib/models";

// How a candidate photo is asked for, and what a run costs.

export const PHOTO_STYLE_SUFFIX =
  "Neutral studio headshot, plain light grey background, soft even lighting, business casual, looking at the camera, no text, no logos, no watermark, photorealistic.";

/** Square, and more than the 116 pt the template draws the photo at. */
export const PHOTO_SIZE = 512;

/** Diffusion steps: 8 gave a clean headshot at 512 px in the probe run (2026-09-25); each step is 10 neurons on phoenix-1.0. */
export const PHOTO_STEPS = 8;

export function photoPrompt(description: string): string {
  return `${description.trim().replace(/\.?$/, ".")} ${PHOTO_STYLE_SUFFIX}`;
}

/**
 * A stable seed per candidate, so a forced re-run gives the same portrait:
 * FNV-1a over the id (Fowler, Noll and Vo, 32-bit), kept below 2^31 for the
 * models' integer range.
 */
export function photoSeed(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 0x80000000;
}

/**
 * Workers AI pricing (developers.cloudflare.com/workers-ai/platform/pricing,
 * 2026-09-25): phoenix-1.0 is 530 neurons per 512×512 tile and 10 per step;
 * 10,000 neurons a day are free. Another model changes the first figure.
 */
export const PHOTO_NEURONS = 530 + PHOTO_STEPS * 10;
export const FREE_NEURONS_PER_DAY = 10_000;

/** Price per 512px image on the Gemini API, for the estimate when the image slot is on Google. */
export const PHOTO_COST_USD = 0.034;

/** The line printed before the step runs: what it will call and what that costs. */
export function photoCostLine(entry: ModelEntry, calls: number): string {
  if (entry.provider === "cloudflare") {
    const perDay = Math.floor(FREE_NEURONS_PER_DAY / PHOTO_NEURONS);
    return `${calls} call(s) to ${entry.model} on Workers AI: ${calls * PHOTO_NEURONS} of the ${FREE_NEURONS_PER_DAY} free neurons a day (${perDay} portraits fit in a day)`;
  }
  return `${calls} call(s) to ${entry.model} (${entry.tier}), about $${(calls * PHOTO_COST_USD).toFixed(2)}`;
}
