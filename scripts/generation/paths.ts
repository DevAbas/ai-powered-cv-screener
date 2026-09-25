import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { cvPath } from "@/lib/candidates/indexFiles";

// Where the pipeline writes: the generation data it
// owns under `data/generation`, and the CVs under `data/cvs`, which the app
// serves through the CV route.

export const DATA_DIR = path.resolve("data");
export const GENERATION_DIR = path.join(DATA_DIR, "generation");
export const SEEDS_DIR = path.join(GENERATION_DIR, "seeds");
export const PHOTOS_DIR = path.join(GENERATION_DIR, "photos");
export const PDF_MANIFEST = path.join(GENERATION_DIR, "manifest.json");
export const PDFS_DIR = path.join(DATA_DIR, "cvs");

export const seedPath = (id: string) => path.join(SEEDS_DIR, `${id}.json`);
export const photoPath = (id: string) => path.join(PHOTOS_DIR, `${id}.jpg`);
export const pdfPath = cvPath;

export async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

/** Writes via a temporary file and a rename, so a crash never leaves a partial file behind. */
export async function writeFileAtomic(file: string, content: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, content);
  await rename(tmp, file);
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}
