// The CV preview panel's width, in px (DESIGN.md, Components: CV preview).

/** Narrowest the panel goes: 20rem at 16px. */
export const PREVIEW_MIN_WIDTH = 320;
/** Widest, as a share of the viewport, so the conversation keeps room. */
export const PREVIEW_MAX_SHARE = 0.7;
/** Where the panel opens: this share of the viewport, never under the minimum below. */
export const PREVIEW_OPEN_SHARE = 0.35;
/** The narrowest the panel opens at: 30rem at 16px. */
export const PREVIEW_OPEN_MIN_WIDTH = 480;

/** The width the panel opens at in a viewport this wide: a third of it, at least 30rem, within the clamp. */
export function defaultPreviewWidth(viewportWidth: number): number {
  return clampPreviewWidth(Math.max(PREVIEW_OPEN_MIN_WIDTH, viewportWidth * PREVIEW_OPEN_SHARE), viewportWidth);
}

/** The width the panel may take for a wanted width in a viewport this wide. */
export function clampPreviewWidth(width: number, viewportWidth: number): number {
  const max = Math.max(PREVIEW_MIN_WIDTH, Math.floor(viewportWidth * PREVIEW_MAX_SHARE));
  return Math.min(max, Math.max(PREVIEW_MIN_WIDTH, Math.round(width)));
}

/** The panel width a drag handle at `pointerX` asks for, with the panel on the right edge. */
export function widthFromPointer(pointerX: number, viewportWidth: number): number {
  return clampPreviewWidth(viewportWidth - pointerX, viewportWidth);
}
