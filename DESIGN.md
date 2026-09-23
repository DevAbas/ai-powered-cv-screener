---
version: alpha
name: CV Screener
description: A quiet monochrome recruiting tool with a single orange accent. Tokens follow Material 3 role names.
colors:
  surface: "#FCFCFC"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F3F3F3"
  surface-container: "#EFEFEF"
  surface-container-high: "#E6E6E6"
  outline: "#E6E6E6"
  outline-variant: "#AFAFAF"
  on-surface-variant: "#595959"
  on-surface: "#202020"
  primary: "#B5591C"
  primary-hover: "#A64B04"
  on-primary: "#FFFFFF"
  primary-outline: "#FFB68E"
  warning: "#B08A2E"
  error: "#D23B3B"
typography:
  headline-lg:
    fontFamily: Google Sans
    fontSize: 1.375rem
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Google Sans
    fontSize: 1.0625rem
    fontWeight: 500
    lineHeight: 1.35
  body-lg:
    fontFamily: Google Sans
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: Google Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Google Sans
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.45
  label-lg:
    fontFamily: Google Sans
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.2
  label-md:
    fontFamily: Google Sans
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.2
  label-sm:
    fontFamily: Google Sans
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.01em
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
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-secondary-hover:
    backgroundColor: "{colors.surface-container-high}"
  button-disabled:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    rounded: "{rounded.full}"
  icon:
    textColor: "{colors.on-surface-variant}"
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
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
  menu-item-hover:
    backgroundColor: "{colors.surface-container-low}"
  menu-item-selected:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface}"
  list-item:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  list-item-hover:
    backgroundColor: "{colors.surface-container-low}"
  list-item-selected:
    backgroundColor: "{colors.surface-container-high}"
  link:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  link-hover:
    textColor: "{colors.primary}"
  table-header:
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-sm}"
  table-cell:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  divider:
    backgroundColor: "{colors.outline}"
  state-icon-warning:
    textColor: "{colors.warning}"
  state-icon-error:
    textColor: "{colors.error}"
---

# CV Screener — Design System

## Overview

A screening tool a recruiter keeps open for hours. It should feel like a
quiet, well-made utility, not a chat app: white, black and one orange.
Soft grey page, white containers, almost no borders, no decoration.
Density is moderate: answers are lists and tables that must be scannable,
so type is compact but never cramped. Nothing animates for its own sake.

## Colors

The palette is three colours: white, black and orange. Every other value is
a tone between them. Roles use Material 3 names.

Values were generated with the Radix Colors custom palette tool from three
seeds: accent `#B5591C`, gray `#8B8B8B`, background `#FCFCFC`. Radix step
anatomy maps to roles: steps 1–2 surfaces, 3–4 containers, 6 and 8 outlines,
9–10 the solid accent, 11–12 neutral text.

- **Primary (#B5591C):** Burnt orange. The only chromatic colour in the UI.
  Used for the primary action, the check mark on selected items and link
  hover. Never for text blocks, content backgrounds or decoration.
- **Surface (#FCFCFC):** Near-white page background, never pure white.
- **Surface container lowest (#FFFFFF):** Panels, inputs, menus, the composer.
- **Surface container low (#F3F3F3):** Hover on rows and menu items.
- **Surface container (#EFEFEF):** Secondary buttons, the model chip.
- **Surface container high (#E6E6E6):** Selected rows and menu items.
- **On surface (#202020):** Body text. Not pure black.
- **On surface variant (#595959):** Secondary text, metadata, disabled text and icons at rest.
- **Outline (#E6E6E6):** Every border and divider. There is one border colour.
- **Outline variant (#AFAFAF):** Disabled icons only.
- **Warning (#B08A2E) and Error (#D23B3B):** Icons only. Never used as a
  background or for running text.

## Typography

One family, Google Sans (SIL OFL), self-hosted. Two working weights, 400 and
500; 600 only when a single element must dominate. No italics.

- **headline-lg / headline-md:** page and section titles, one-line summaries.
- **body-lg:** primary input text.
- **body-md:** running text, list items, table cells.
- **body-sm:** secondary lines and metadata.
- **label-lg / label-md / label-sm:** buttons, menu items, section headers
  (label-sm uppercase, letter-spaced).

Lines are never justified. Prefer lists and tables over paragraphs.

## Layout

Two-panel desktop layout: a fluid conversation panel and a fixed-width pool
panel, both padded with `spacing.gutter`. Content columns are capped at a
comfortable reading width and share one left edge. All spacing is a multiple
of `spacing.base` (0.25rem). Rows inside a list sit close together; blocks
are separated generously, so density and clarity coexist.

Breakpoints: sm 40rem, md 48rem, lg 64rem, xl 80rem. Below md the panels
stack and a selected CV takes the full viewport with a back control.

Motion is functional only, 150–200ms. Easings: standard
`cubic-bezier(0.2, 0, 0, 1)`, decelerate `cubic-bezier(0, 0, 0, 1)` for
entering elements, accelerate `cubic-bezier(0.3, 0, 1, 1)` for leaving ones.

## Elevation & Depth

Depth is tonal first: `surface` → `surface-container-lowest` →
`surface-container` → `surface-container-high`. Shadows exist in two places
only: floating input containers use raised
(`0 0.25rem 1.5rem rgba(0, 0, 0, 0.06)`), menus use overlay
(`0 0.5rem 2rem rgba(0, 0, 0, 0.10)`).

## Shapes

Soft, with pill-shaped actions. Buttons use `rounded.full`. The largest
floating container uses `rounded.xl`; menus `rounded.lg`; inputs and containers
`rounded.md`; menu rows and small controls `rounded.sm`. Links are plain text
with an underline, never chips.

## Components

Interactive primitives come from Headless UI and are styled with these tokens
only; states are styled through its `data-*` attributes (`data-hover`,
`data-focus`, `data-selected`, `data-disabled`, `data-open`). Icons are
`lucide-react`, 1rem in text and 1.25rem in buttons.

- **Buttons:** primary is orange for the single main action; secondary is
  neutral on `surface-container`. Disabled: `surface-container` background
  with `on-surface-variant` text; the state is carried by the neutral fill,
  the absence of hover and a not-allowed cursor.
- **Icons:** `on-surface-variant` at rest, `on-surface` on hover, `outline-variant` when disabled.
- **Inputs:** no border at rest when placed on `surface`; the background
  step separates them. Focus: 2px `primary-outline` ring.
- **Menus:** white panel with the overlay shadow; rows use `rounded.sm`;
  hover is `surface-container-low`; the selected row is
  `surface-container-high` with a `primary` check icon.
- **Links:** `on-surface` with underline; hover `primary`.
- **Lists:** rows separated by `outline`; hover is `surface-container-low`,
  selected is `surface-container-high`; never a coloured background.
- **Tables:** header in `label-sm` `on-surface-variant`; cells `body-md`;
  horizontal rules only, no vertical rules, no zebra striping.
- **States:** empty, insufficient information, out of scope and error are a
  single line of text with a small leading icon. Colour appears only on the
  warning and error icons.

## Do's and Don'ts

- Do keep orange for interaction only; if more than one orange element
  competes for attention on a screen, something is wrong.
- Do use a tonal step before a border, and a border before a shadow.
- Don't render states as filled or bordered boxes.
- Don't use chat bubbles, gradients, emoji or decorative illustration.
- Don't wrap content in cards; whitespace is the container.
- Don't hardcode colours or sizes in components; every value traces to a
  token in this file.
- Don't add a second accent for any purpose.
- Don't use weights above 500 for running text.