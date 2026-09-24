import { readSeeds } from "../generate/seeds";
import type { Seeds } from "./types";

/** The ground truth (PLAN, Data layout): the seeds, read by the evaluation only. */
export async function loadSeeds(): Promise<Seeds> {
  const seeds = await readSeeds();
  if (seeds.size === 0) throw new Error("No seeds found; run npm run generate first.");
  return seeds;
}
