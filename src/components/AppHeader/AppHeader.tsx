import { Logo } from "@/components/Logo";
import { ColorModeButton } from "@/components/ui/ColorModeButton";

/**
 * Logo, product name and the colour mode toggle (PRD, Information
 * architecture). Stays at the top; the conversation fades out as it passes
 * underneath (DESIGN.md, Elevation & Depth), so no shadow and no border.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-4 bg-surface px-gutter">
      {/* A flex box, not a line box: the heading is exactly as tall as the logo, so the logo centres in the header. */}
      <h1 className="flex">
        <Logo />
      </h1>
      <ColorModeButton size="sm" />
      {/* The fade: 2rem of `surface` thinning to nothing, over the content below. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full h-8 bg-linear-to-b from-surface to-transparent" />
    </header>
  );
}
