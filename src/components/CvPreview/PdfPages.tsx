"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { capHeightBox } from "@/components/ui/recipe";

export interface PdfPagesProps {
  /** The PDF's URL, without a fragment. */
  href: string;
  /** The page scrolled into view once rendered. */
  page: number;
}

type Status = "loading" | "ready" | "error";

/** Space between pages and around them, in px: 4 spacing units. */
const GAP = 16;
/** A resize redraws only once the width has been still this long. */
const REDRAW_DELAY_MS = 150;

/**
 * The PDF's pages, drawn one under another with pdf.js and fitted to the
 * panel's width, so no browser viewer and none of its controls appear. The
 * document loads once; a resize redraws the same canvases after a pause,
 * cancelling any drawing still in flight. A spinner sits in the middle
 * until the first drawing is done.
 */
export function PdfPages({ href, page }: PdfPagesProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvases = useRef<HTMLCanvasElement[]>([]);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [width, setWidth] = useState(0);

  // The width pages are fitted to, kept current as the panel is resized.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width) - GAP * 2));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Load the document once; pdf.js itself only when a preview opens. The
  // parent keys this component by file, so a new file starts fresh here.
  // Destroying the loading task frees the document and its worker.
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        if (cancelled) return;
        task = pdfjs.getDocument({ url: href });
        const document = await task.promise;
        if (!cancelled) setPdf(document);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [href]);

  // Draw every page at the current width; one canvas per page, reused across redraws.
  useEffect(() => {
    const element = scroller.current;
    if (!pdf || !element || width <= 0) return;
    let cancelled = false;
    let task: RenderTask | null = null;

    const timer = setTimeout(async () => {
      if (canvases.current.length !== pdf.numPages) {
        canvases.current = Array.from({ length: pdf.numPages }, (_, i) => {
          const canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Page ${i + 1} of ${pdf.numPages}`);
          // DESIGN.md `preview`: pages on surface-container-lowest with the raised shadow
          canvas.className = "block bg-surface-container-lowest shadow-raised";
          return canvas;
        });
        element.replaceChildren(...canvases.current);
      }
      const dpr = window.devicePixelRatio || 1;
      try {
        for (let n = 1; n <= pdf.numPages; n++) {
          const pdfPage = await pdf.getPage(n);
          if (cancelled) return;
          const viewport = pdfPage.getViewport({ scale: width / pdfPage.getViewport({ scale: 1 }).width });
          const canvas = canvases.current[n - 1];
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          task = pdfPage.render({ canvas, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] });
          await task.promise;
          task = null;
          if (cancelled) return;
          if (n === 1) {
            setStatus("ready");
            canvases.current[Math.min(page, pdf.numPages) - 1]?.scrollIntoView({ block: "start" });
          }
        }
      } catch {
        // A cancelled drawing rejects; anything else is a broken file.
        if (!cancelled) setStatus("error");
      }
    }, REDRAW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [pdf, width, page]);

  return (
    <div className="relative min-h-0 flex-1 overflow-auto bg-surface-container">
      {/* DESIGN.md, Layout: gutter around and between pages */}
      <div ref={scroller} className="flex min-h-full flex-col items-center gap-4 p-4" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center">
          {status === "loading" ? (
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <LoaderCircle aria-hidden className="size-5 shrink-0 motion-safe:animate-spin" />
              <span role="status" className={capHeightBox}>
                Loading the CV…
              </span>
            </div>
          ) : (
            <StatusMessage status="error">The CV could not be loaded.</StatusMessage>
          )}
        </div>
      )}
    </div>
  );
}
