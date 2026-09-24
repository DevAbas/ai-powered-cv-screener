---
version: alpha
name: CV Screener
description: A quiet monochrome recruiting tool with a single mint accent. Tokens follow Material 3 role names.
colors:
  surface: "#FCFCFC"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F3F3F3"
  surface-container: "#EFEFEF"
  surface-container-high: "#E6E6E6"
  surface-container-highest: "#E0E0E0"
  outline: "#F3F3F3"
  outline-variant: "#AFAFAF"
  on-surface-variant: "#595959"
  on-surface: "#202020"
  primary: "#00F8C0"
  primary-hover: "#16DDAC"
  primary-pressed: "#08C498"
  on-primary: "#0A281E"
  primary-outline: "#2DDCAC"
  primary-text: "#007C5A"
  primary-container: "#B1FCDF"
  on-primary-container: "#004932"
  inverse-surface: "#202020"
  inverse-on-surface: "#FCFCFC"
  warning: "#B08A2E"
  error: "#D23B3B"
typography:
  headline-lg:
    fontFamily: Google Sans
    fontSize: 1.375rem
    fontWeight: 500
    lineHeight: "1.3"
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Google Sans
    fontSize: 1.0625rem
    fontWeight: 500
    lineHeight: "1.35"
  body-lg:
    fontFamily: Google Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: "1.55"
  body-md:
    fontFamily: Google Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: "1.5"
  body-sm:
    fontFamily: Google Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: "1.45"
  label-lg:
    fontFamily: Google Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: "1.2"
  label-md:
    fontFamily: Google Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: "1.2"
  label-sm:
    fontFamily: Google Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: "1.2"
    letterSpacing: 0.01em
  wordmark:
    fontFamily: Google Sans
    fontSize: 1rem
    fontWeight: 600
    lineHeight: "1.2"
    letterSpacing: 0.16em
  mark:
    fontFamily: Google Sans
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: "1"
    letterSpacing: 0.02em
rounded:
  none: 0px
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  full: 9999px
spacing:
  base: 0.25rem
  gutter: 1.25rem
components:
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  logo:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
  logo-wordmark:
    textColor: "{colors.on-surface}"
    typography: "{typography.wordmark}"
  question:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
  composer:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
  model-chip:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  model-chip-hover:
    backgroundColor: "{colors.surface-container-high}"
  model-chip-pressed:
    backgroundColor: "{colors.surface-container-highest}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  button-secondary:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-secondary-hover:
    backgroundColor: "{colors.surface-container-high}"
  button-secondary-pressed:
    backgroundColor: "{colors.surface-container-highest}"
  button-disabled:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
  icon:
    textColor: "{colors.on-surface-variant}"
  icon-hover:
    backgroundColor: "{colors.surface-container-low}"
    textColor: "{colors.on-surface}"
  icon-pressed:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
  icon-disabled:
    textColor: "{colors.outline-variant}"
  input:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
  input-placeholder:
    textColor: "{colors.on-surface-variant}"
  focus-ring:
    backgroundColor: "{colors.primary-outline}"
  menu:
    backgroundColor: "{colors.surface-container-lowest}"
    rounded: "{rounded.lg}"
  menu-item:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  menu-item-hover:
    backgroundColor: "{colors.surface-container-low}"
  link:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  link-hover:
    textColor: "{colors.primary-text}"
  table-header:
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
  table-cell:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  file-card:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
  file-card-hover:
    backgroundColor: "{colors.surface-container-low}"
  file-card-pressed:
    backgroundColor: "{colors.surface-container}"
  preview:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
  tooltip:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
  divider:
    backgroundColor: "{colors.outline}"
  scrollbar:
    backgroundColor: "{colors.outline}"
  state-icon-warning:
    textColor: "{colors.warning}"
  state-icon-error:
    textColor: "{colors.error}"
---

# CV Screener — Design System

## Overview

A screening tool a recruiter keeps open for hours. It should feel like a
quiet, well-made utility: white, black and one mint.
Soft grey page, white containers, almost no borders, no decoration.
Density is moderate: answers are lists and tables that must be scannable,
so type is compact but never cramped. Nothing animates for its own sake.

## Colors

The palette is three colours: white, black and mint. Every other value is
a tone between them. Roles use Material 3 names.

Values were generated with the Radix Colors custom palette tool from three
seeds: accent `#00F8C0` (`#00FFC6` in dark), gray `#8B8B8B`, background
`#FCFCFC`. Radix step anatomy maps to roles: steps 1–2 surfaces, 3–4
containers, 6 and 8 outlines, 11–12 neutral text; for the accent, 4 the
question tint, 7 the focus ring, 9 the solid fill, 11 accent text, 12 text on
the tint. Hover and pressed are derived from step 9 (below).

- **Primary (#00F8C0):** Mint. The only chromatic colour in the UI, used for
  the primary action, the logo mark and the band of the PDF icon. Never for
  text blocks, content backgrounds or decoration.
- **On primary (#0A281E):** Text and icons on `primary`: Radix's contrast
  colour, since mint is too light for white text.
- **Primary hover (#16DDAC) and pressed (#08C498):** `primary` with its OKLCH
  lightness 7 and 14 points lower, same hue and chroma. Radix step 10 is too
  close to step 9 for this bright accent to read as a hover.
- **Primary text (#007C5A):** The accent as text or an icon on a surface: the
  check mark on selected items and link hover. Radix step 11; mint itself is
  too light to read on the page.
- **Inverse surface (#202020) and inverse on surface (#FCFCFC):** Tooltips:
  very dark in light mode, light in dark mode.
- **Primary container (#B1FCDF):** A light mint tint (Radix step 4): the
  background of the recruiter's question.
- **On primary container (#004932):** The question's text on that tint
  (Radix step 12, the accent's high-contrast text).
- **Surface (#FCFCFC):** Near-white page background, never pure white.
- **Surface container lowest (#FFFFFF):** Inputs, menus, the composer.
- **Surface container low (#F3F3F3):** Hover on menu items and ghost icon buttons.
- **Surface container (#EFEFEF):** Secondary buttons, the model chip.
- **Surface container high (#E6E6E6):** Hover on secondary buttons and the model chip; ghost icon buttons while pressed.
- **Surface container highest (#E0E0E0):** Pressed secondary buttons and the model chip. Radix step 5.
- **On surface (#202020):** Body text. Not pure black.
- **On surface variant (#595959):** Secondary text, metadata, disabled text and icons at rest.
- **Outline (#F3F3F3):** Every border and divider, and scrollbar thumbs. There is one border colour, kept faint.
- **Outline variant (#AFAFAF):** Disabled icons only.
- **Warning (#B08A2E) and Error (#D23B3B):** Icons only. Never used as a
  background or for running text.

## Typography

One family, Google Sans (SIL OFL), self-hosted. Two working weights, 400 and
500; 600 only when a single element must dominate: the logo. No italics.

- **headline-lg / headline-md:** page and section titles, one-line summaries.
- **body-lg:** primary input text.
- **body-md:** running text, list items, table cells.
- **body-sm:** secondary lines, metadata and menu rows.
- **label-lg / label-md / label-sm:** buttons, tooltips, section headers
  (label-sm uppercase, letter-spaced).
- **wordmark / mark:** the logo only: the product name uppercase, 600 and
  widely letter-spaced; the "CV" letters of the mark, 600.

Lines are never justified. Prefer lists and tables over paragraphs.

## Layout

Single-column layout: the conversation, padded with `spacing.gutter`, with
the message column capped at a comfortable reading width and the composer
centred on it, 1rem wider on each side. All spacing is a multiple of half
`spacing.base` (0.125rem); whole steps are the default, half steps fine-tune
small controls. Rows inside a list sit close together; blocks
are separated generously, so density and clarity coexist.

Breakpoints: sm 40rem, md 48rem, lg 64rem, xl 80rem.

Motion is functional only, 150–200ms. Easings: standard
`cubic-bezier(0.2, 0, 0, 1)`, decelerate `cubic-bezier(0, 0, 0, 1)` for
entering elements, accelerate `cubic-bezier(0.3, 0, 1, 1)` for leaving ones.
Loading motion is the one exception: the progress line breathes (a 1.6s
opacity cycle on its glyph) and one band of ink sweeps its label every
1.8s, both off under reduced motion; the values live in
`src/styles/theme.css`. Following a response scrolls smoothly, never under
reduced motion.

## Elevation & Depth

Depth is tonal first: `surface` → `surface-container-lowest` →
`surface-container` → `surface-container-high`. Shadows exist in three
places only: floating input containers use raised
(`0 0.25rem 1.5rem rgba(0, 0, 0, 0.06)`), menus use overlay
(`0 0.5rem 2rem rgba(0, 0, 0, 0.10)`), and the file card uses soft
(`0 0.125rem 0.75rem rgba(0, 0, 0, 0.04)`), which it loses while pressed,
so the press reads as the card meeting the page. In dark the same shadows
use opacity 0.5 (raised), 0.6 (overlay) and 0.35 (soft), since the light
values are invisible on dark surfaces. The sticky header casts no shadow and has no border: a 2rem
gradient from `surface` to transparent below it fades the conversation out
as it passes underneath.

## Shapes

Soft, with pill-shaped actions. Buttons use `rounded.full`. The largest
floating container and the question use `rounded.xl`; menus `rounded.lg`;
inputs, containers and tooltips `rounded.md`; menu rows and small controls
`rounded.sm`. Links are plain text
with an underline, never chips.

## Components

Components are styled with these tokens only; which libraries they use and
how states are selected is in `AGENTS.md`, Conventions. Icons are 1rem in
text and in `xs` buttons, 1.25rem in other buttons.

- **Logo:** the mark is "CV" in `mark` on a `primary` square of 1.75rem,
  `rounded.sm`: the letters are traced from the font as outlines and centred
  on their bounding box (`scripts/logo-mark.py`), so no font has to load and
  they sit the same in every browser; the wordmark "SCREENER" follows in
  `wordmark` (`logo-wordmark`). The same drawing, at the same colours, is
  the favicon.
- **Buttons:** primary is mint for the single main action; secondary is
  neutral on `surface-container`. Disabled: `surface-container` background
  with `on-surface-variant` text; the state is carried by the neutral fill,
  the absence of hover and a not-allowed cursor. Pressed goes one tonal step
  past hover: `primary-pressed` for primary, `surface-container-highest` for
  secondary and the model chip. A ghost icon button shows a
  `surface-container-low` circle on hover and `surface-container-high` while
  pressed. Sizes: `xs` 1.875rem, `sm` 2rem, `md` 2.25rem tall.
- **Icons:** `on-surface-variant` at rest, `on-surface` on hover, `outline-variant` when disabled; 1.25rem beside a headline (a candidate's name).
- **Inputs:** no border at rest when placed on `surface`; the background
  step separates them. Focus: 2px `primary-outline` ring.
- **Composer:** the largest floating container: `surface-container-lowest`,
  `rounded.xl`, raised shadow. One text input with a 0.625rem bottom margin,
  then a 0.625rem gap to a bottom row. Left: model chip, globe, ellipsis;
  right: audio-lines and a circular primary send button that becomes Stop
  while a request runs. Globe, ellipsis and audio-lines are disabled. The
  input grows with the question up to a maximum height, then scrolls.
  Centred in the empty state; after the first question it sits at the bottom
  of the conversation, 1rem wider on each side than the message column.
- **Question:** the recruiter's question sits right-aligned on
  `primary-container`, `rounded.xl` (half the one-line height, so a single
  line has fully round ends and a single character is a circle), at least
  as wide as it is tall and at most 33.75rem (540px) wide.
  Answers stay unboxed.
- **Model menu:** the model chip (`surface-container`, `rounded.full`) shows
  the vendor logo, the model name and a chevron. Its menu lists the answer
  models, each with vendor logo and name, and follows the menu rules.
- **Menus:** white panel with the overlay shadow and a little more inner
  padding than a row's own; rows in `body-sm`, `rounded.sm`; hover is
  `surface-container-low`; the selected row keeps no background and is
  marked only by a `primary-text` check icon.
- **Links:** `on-surface` with underline; hover `primary-text`.
- **File card:** the one card in the interface, for a CV that opens: the
  1.5rem PDF icon, its document in `on-surface` and its download badge in
  solid `primary` with an `on-primary` arrow (like the logo mark, a thing,
  not a text block), the file name in `label-lg` and a `body-sm`
  line beneath saying "PDF", which reads "Open file" on hover;
  `surface-container-lowest` with an `outline` border, the soft shadow,
  `rounded.md`, 15.625rem (250px) wide (narrower only when the column is),
  a longer file
  name cut with an ellipsis. Hover is `surface-container-low`, and the line
  reads "Open file"; pressed goes one tone further, `surface-container`,
  without the shadow; both transition.
- **CV preview:** a file card opens the CV in a panel docked to the right
  edge, full height, `surface-container-lowest` with an `outline` left edge
  and no shadow: the CV's pages drawn one under another on
  `surface-container`, each page on `surface-container-lowest` with the
  raised shadow and a gutter of 1rem, under a 3.5rem header with the PDF
  icon, the file name in `label-lg`, and ghost icon buttons Download and
  Close; while the pages load, a spinner and "Loading the CV…" sit in the
  middle. It opens 30rem wide, is dragged wider or narrower by
  its left edge between 20rem and 70% of the viewport (the conversation
  keeps the rest), and the handle is a `divider` line that fills to
  `outline-variant` on hover and while dragging; it opens at 35% of the
viewport, never under 30rem. Below `lg` it fills the
  screen instead, with the same header and no handle. Escape closes it.
- **Lists:** rows separated by whitespace (`spacing.base` × 5), never by a
  rule or a coloured background. A candidate row is the name in
  `headline-md` behind a person icon, why they match in `body-md`
  `on-surface-variant`, and the file card.
- **Scrollbars:** thin, with a transparent track and an `outline` thumb:
  visible on a careful look, never competing with content.
- **Tables:** header in `label-sm` `on-surface-variant`; cells `body-md`;
  horizontal rules only, no vertical rules, no zebra striping.
- **Tooltips:** a short label on `inverse-surface` with `inverse-on-surface`
  text, `label-md`, `rounded.md`. Fades in on hover after 150ms and at once on
  keyboard focus; Escape closes it.
- **States:** empty, insufficient information, out of scope and error are a
  single line of text with a small leading icon. Colour appears only on the
  warning and error icons.
- **Progress line:** one `label-lg` line with a sparkle glyph and a
  tabular clock: the glyph breathes and a band of ink sweeps the label
  while the current step runs (Layout: loading motion); once answered it
  settles into "Searched for 4.2s" in `on-surface-variant` and the Copy
  action sits beside it.

## Do's and Don'ts

- Do keep solid mint (`primary`) for interaction, the logo mark and the PDF
  icon's badge only; if
  more than one solid mint element competes for attention, something is
  wrong. The mint tint (`primary-container`) marks the recruiter's question
  only.
- Do use a tonal step before a border, and a border before a shadow.
- Don't render states as filled or bordered boxes.
- Don't box answers; only the question sits on a tint. No gradients, emoji
  or decorative illustration.
- Don't wrap content in cards; whitespace is the container. The file card
  is the exception: it is the file, not a container for content.
- Every colour, size and radius on screen traces to a token in this file.
- Don't add a second accent for any purpose.
- Don't use weights above 500 for running text.