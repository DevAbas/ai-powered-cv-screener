import { readFile } from "node:fs/promises";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { exists, PDF_MANIFEST, pdfPath, photoPath, readJson, writeFileAtomic, writeJsonAtomic } from "./fs";
import type { StepOptions, StepReport } from "./options";
import { log, shortError } from "./options";
import { countPdfPages, MAX_PAGES } from "./pdf";
import { ROSTER } from "./roster";
import { readSeeds } from "./seeds";
import { renderTemplate } from "./templates";

// Step 3: one PDF per seed in `public/cvs`, photo embedded when it exists
// (PLAN, Generation pipeline). `data/pdfs.json` records each PDF's page
// count and whether it carries a photo.

export const PdfManifestSchema = z.record(
  z.string(),
  z.object({ pages: z.number().int().min(1).max(MAX_PAGES), photo: z.boolean() }),
);
export type PdfManifest = z.infer<typeof PdfManifestSchema>;

export async function readManifest(): Promise<PdfManifest> {
  return (await exists(PDF_MANIFEST)) ? PdfManifestSchema.parse(await readJson(PDF_MANIFEST)) : {};
}

export async function runPdfs(options: StepOptions): Promise<StepReport> {
  const report: StepReport = { step: "pdfs", done: [], skipped: [], failed: [] };
  const seeds = await readSeeds();
  const manifest = await readManifest();

  for (const { id } of ROSTER) {
    if (options.only && !options.only.includes(id)) continue;
    const seed = seeds.get(id);
    if (!seed) {
      log("pdfs", id, "no seed yet, skipped");
      report.skipped.push(id);
      continue;
    }
    if (!options.force && (await exists(pdfPath(id)))) {
      report.skipped.push(id);
      continue;
    }
    const hasPhoto = await exists(photoPath(id));
    if (options.dryRun) {
      log("pdfs", id, `would render template ${seed.template}${hasPhoto ? " with photo" : " with initials"}`);
      report.done.push(id);
      continue;
    }
    try {
      const photo = hasPhoto ? await readFile(photoPath(id)) : undefined;
      const pdf = await renderToBuffer(renderTemplate(seed, photo));
      const pages = countPdfPages(pdf);
      if (pages < 1 || pages > MAX_PAGES) throw new Error(`rendered ${pages} pages; expected 1-${MAX_PAGES}`);
      await writeFileAtomic(pdfPath(id), pdf);
      manifest[id] = { pages, photo: hasPhoto };
      report.done.push(id);
      log("pdfs", id, `written (template ${seed.template}, ${pages} page(s)${hasPhoto ? ", photo" : ", initials"})`);
    } catch (error) {
      report.failed.push(id);
      log("pdfs", id, `FAILED: ${shortError(error)}`);
    }
  }

  if (!options.dryRun && report.done.length) {
    const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
    await writeJsonAtomic(PDF_MANIFEST, sorted);
  }
  return report;
}
