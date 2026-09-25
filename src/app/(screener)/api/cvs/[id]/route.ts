import { readFile } from "node:fs/promises";
import { resolveCv } from "@/lib/candidates/indexFiles";
import { loadPool } from "@/lib/candidates/candidatePool";

// GET /api/cvs/<id>: the CV of an indexed candidate as
// a PDF, shown inline by the preview and saved under its readable name. The
// id is looked up in the pool and the path comes from the index entry, never
// from the request. Access control would go here; v1 has none (PRD, Non-goals).

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const cv = resolveCv(loadPool().byId, id);
  if (!cv) return new Response("No such CV", { status: 404, headers: { "cache-control": "no-store" } });
  const bytes = await readFile(cv.file);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${cv.fileName}"`,
      "cache-control": "no-store",
    },
  });
}
