import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { cvFileName } from "@/lib/pool/source-href";

// Where the pipeline writes (PLAN, Generation pipeline). App code never
// reads `data/`; the PDFs are public so sources can link to them.

export const DATA_DIR = path.resolve("data");
export const SEEDS_DIR = path.join(DATA_DIR, "seeds");
export const PHOTOS_DIR = path.join(DATA_DIR, "photos");
export const PDFS_DIR = path.resolve("public", "cvs");
export const PDF_MANIFEST = path.join(DATA_DIR, "pdfs.json");

export const seedPath = (id: string) => path.join(SEEDS_DIR, `${id}.json`);
export const photoPath = (id: string) => path.join(PHOTOS_DIR, `${id}.jpg`);
export const pdfPath = (id: string) => path.join(PDFS_DIR, cvFileName(id));

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
