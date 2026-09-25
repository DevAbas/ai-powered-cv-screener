"use client";

import { Download, X } from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties } from "react";
import { IconButton } from "@/components/ui/Button";
import { PdfIcon } from "@/components/ui/Icons";
import { Tooltip } from "@/components/ui/Tooltip";
import { useResizablePanel } from "@/hooks/useResizablePanel";
import { cvFileName } from "@/lib/candidates";
import { cx } from "@/components/ui/recipe";
import { PdfPages } from "./PdfPages";
import { ResizeHandle } from "./ResizeHandle";

export interface CvPreviewProps {
  candidateId: string;
  name: string;
  /** The page the preview opens on. */
  page: number;
  /** The PDF, without a fragment. */
  href: string;
  onClose: () => void;
  /** Reports the panel's width so the page beside it can make room. */
  onResize?: (width: number) => void;
  className?: string | undefined;
}

/**
 * The CV beside the conversation (PRD, Core flow: Verify): its pages drawn
 * by pdf.js in a panel docked to the right, resized by dragging its left
 * edge, with Download and Close. Escape closes it.
 */
export function CvPreview({ candidateId, name, page, href, onClose, onResize, className }: CvPreviewProps) {
  const panel = useResizablePanel();
  const fileName = cvFileName(candidateId);

  useEffect(() => {
    onResize?.(panel.width);
  }, [panel.width, onResize]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function download() {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.click();
  }

  return (
    // DESIGN.md `preview`: surface-container-lowest, an outline edge, no shadow.
    // Below `lg` it is the whole screen; from `lg` it docks at the dragged width.
    <aside
      aria-label={`${name}'s CV`}
      className={cx("fixed inset-y-0 right-0 z-20 flex w-full flex-col bg-surface-container-lowest lg:w-(--preview-width) lg:border-l lg:border-outline", className)}
      style={{ "--preview-width": `${panel.width}px` } as CSSProperties}
    >
      <ResizeHandle {...panel.handleProps} className="hidden lg:flex" />
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-outline px-4">
        <PdfIcon aria-hidden className="size-5 text-on-surface" />
        <h2 className="min-w-0 flex-1 truncate text-label-lg leading-label-lg font-(weight:--font-weight-label-lg) text-on-surface">{fileName}</h2>
        {/* Each label repeats the button's name, so the trigger props are not spread. */}
        <Tooltip content="Download CV" side="bottom">
          {() => (
            <IconButton aria-label="Download CV" variant="ghost" size="sm" onClick={download}>
              <Download aria-hidden />
            </IconButton>
          )}
        </Tooltip>
        <Tooltip content="Close" side="bottom" align="end">
          {() => (
            <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
              <X aria-hidden />
            </IconButton>
          )}
        </Tooltip>
      </header>
      <PdfPages key={candidateId} href={href} page={page} />
    </aside>
  );
}
