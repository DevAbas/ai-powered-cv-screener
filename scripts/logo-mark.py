# Traces the logo mark: "CV" from the self-hosted Google Sans at
# DESIGN.md `typography.mark` (weight 600, 0.875rem of the 1.75rem square,
# 0.02em tracking), centred on its bounding box, as one SVG path. Writes
# src/components/Logo/LogoMark.tsx and src/app/icon.svg. Needs fontTools
# and brotli (pip). Rerun when the font or the token changes.
#
#   python3 scripts/logo-mark.py

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

SQUARE, SIZE, TRACK, WEIGHT = 28.0, 14.0, 0.02, 600  # viewBox; typography.mark in viewBox units
TEXT = "CV"

font = TTFont("src/app/fonts/google-sans-latin.woff2")
if "fvar" in font:
    font = instantiateVariableFont(font, {"wght": WEIGHT})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
scale = SIZE / font["head"].unitsPerEm


def draw(pen, dx=0.0, dy=0.0):
    x = 0.0
    for ch in TEXT:
        glyph = glyphs[cmap[ord(ch)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, x + dx, dy)))  # font units → viewBox, y flipped
        x += glyph.width * scale + TRACK * SIZE


bounds = BoundsPen(glyphs)
draw(bounds)
xmin, ymin, xmax, ymax = bounds.bounds
dx, dy = (SQUARE - (xmax - xmin)) / 2 - xmin, (SQUARE - (ymax - ymin)) / 2 - ymin
pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}")
draw(pen, dx, dy)
d = pen.getCommands()

with open("src/components/Logo/LogoMark.tsx", "w") as f:
    f.write(f'''import type {{ ComponentProps }} from "react";
import {{ cx }} from "@/lib/recipe";

export type LogoMarkProps = ComponentProps<"svg">;

/**
 * "CV" as outlines: Google Sans at `typography.mark` (600, 0.875rem of a
 * 1.75rem square, 0.02em tracking), traced by scripts/logo-mark.py and
 * centred on its bounding box. No font loads, so it sits the same
 * everywhere; `app/icon.svg` is the same drawing.
 */
export const LOGO_MARK_PATH =
  "{d}";

/** The mark alone: "CV" on the mint square (DESIGN.md `logo`). */
export function LogoMark({{ className, ...rest }}: LogoMarkProps) {{
  return (
    <svg viewBox="0 0 28 28" aria-hidden {{...rest}} className={{cx("size-7 shrink-0", className)}}>
      {{/* DESIGN.md `logo`: primary, on-primary, rounded.sm (8 of 28) */}}
      <rect width="28" height="28" rx="8" className="fill-primary" />
      <path d={{LOGO_MARK_PATH}} className="fill-on-primary" />
    </svg>
  );
}}
''')
with open("src/app/icon.svg", "w") as f:
    f.write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="32" height="32">
  <!-- DESIGN.md `logo`: colors.primary, colors.on-primary, rounded.sm; the same drawing as LogoMark (scripts/logo-mark.py). -->
  <rect width="28" height="28" rx="8" fill="#00F8C0"/>
  <path d="{d}" fill="#0A281E"/>
</svg>
''')
print(f"mark: {xmax - xmin:.2f} x {ymax - ymin:.2f} centred in {SQUARE:g}; files written")
