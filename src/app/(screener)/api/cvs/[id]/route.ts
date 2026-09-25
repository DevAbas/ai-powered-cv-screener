import { readFile, stat } from "node:fs/promises";
import { resolveCv } from "@/lib/candidates/indexFiles";
import { loadPool } from "@/lib/candidates/candidatePool";
import { cvEtag, etagMatches } from "@/lib/candidates";

// GET /api/cvs/<id>: the CV of an indexed candidate as a PDF, shown inline
// by the preview and saved under its readable name. The id is looked up in
// the pool and the path comes from the index entry, never from the request.
// The browser keeps the file but asks before reusing it (RFC 9110,
// `no-cache` with a validator): one bytes-free 304 per open, never a stale
// CV after a regeneration, and `private` keeps it out of shared caches.
// Access control would go here; v1 has none (PRD, Non-goals).

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const cv = resolveCv(loadPool().byId, id);
  if (!cv) return new Response("No such CV", { status: 404, headers: { "cache-control": "no-store" } });
  const info = await stat(cv.file);
  const etag = cvEtag(info.size, info.mtimeMs);
  const validators = { "cache-control": "private, no-cache", etag, "last-modified": info.mtime.toUTCString() };
  if (etagMatches(request.headers.get("if-none-match"), etag)) return new Response(null, { status: 304, headers: validators });
  const bytes = await readFile(cv.file);
  return new Response(new Uint8Array(bytes), {
    headers: { ...validators, "content-type": "application/pdf", "content-disposition": `inline; filename="${cv.fileName}"` },
  });
}
