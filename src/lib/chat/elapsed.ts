// Elapsed time of a request, in tenths of a second, as the progress line
// shows and announces it.

const TENTHS_PER_MINUTE = 600;

/** "4.2s", or "1m 3.5s" from a minute on. */
export function formatElapsed(tenths: number): string {
  if (tenths < TENTHS_PER_MINUTE) return `${(tenths / 10).toFixed(1)}s`;
  return `${Math.floor(tenths / TENTHS_PER_MINUTE)}m ${((tenths % TENTHS_PER_MINUTE) / 10).toFixed(1)}s`;
}

/** The same, in words for a screen reader. */
export function spokenElapsed(tenths: number): string {
  if (tenths < TENTHS_PER_MINUTE) return `${(tenths / 10).toFixed(1)} seconds`;
  return `${Math.floor(tenths / TENTHS_PER_MINUTE)} minutes ${((tenths % TENTHS_PER_MINUTE) / 10).toFixed(1)} seconds`;
}
