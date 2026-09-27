---
# The design system's rules. Every value lives in the design tokens `imports:` names (W3C Design
# Tokens), never here, as the format's planned token import intends (google-labs-code/design.md#13):
# `components:` names, by their token ids, the roles each component reads.
version: alpha
name: CV Screener
description: A quiet monochrome recruiting tool with a single mint accent. The rules and their reasons; the values are the design tokens it imports.
imports: ./tokens/design.resolver.json
components:
  page:
    backgroundColor: "{color.surface}"
    textColor: "{color.on-surface}"
    typography: "{typography.body-md}"
  logo:
    backgroundColor: "{color.primary}"
    textColor: "{color.on-primary}"
    typography: "{typography.mark}"
    rounded: "{rounded.sm}"
  logo-wordmark:
    textColor: "{color.on-surface}"
    typography: "{typography.wordmark}"
  question:
    backgroundColor: "{color.primary-container}"
    textColor: "{color.on-primary-container}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
  composer:
    backgroundColor: "{color.surface-container-lowest}"
    textColor: "{color.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
  model-chip:
    backgroundColor: "{color.surface-container}"
    textColor: "{color.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  model-chip-hover:
    backgroundColor: "{color.surface-container-high}"
  model-chip-pressed:
    backgroundColor: "{color.surface-container-highest}"
  button-primary:
    backgroundColor: "{color.primary}"
    textColor: "{color.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-primary-hover:
    backgroundColor: "{color.primary-hover}"
  button-primary-pressed:
    backgroundColor: "{color.primary-pressed}"
  button-secondary:
    backgroundColor: "{color.surface-container}"
    textColor: "{color.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
  button-secondary-hover:
    backgroundColor: "{color.surface-container-high}"
  button-secondary-pressed:
    backgroundColor: "{color.surface-container-highest}"
  button-disabled:
    backgroundColor: "{color.surface-container}"
    textColor: "{color.on-surface-variant}"
    rounded: "{rounded.full}"
  icon:
    textColor: "{color.on-surface-variant}"
  icon-hover:
    backgroundColor: "{color.surface-container-low}"
    textColor: "{color.on-surface}"
  icon-pressed:
    backgroundColor: "{color.surface-container-high}"
    textColor: "{color.on-surface}"
  icon-disabled:
    textColor: "{color.outline-variant}"
  input:
    backgroundColor: "{color.surface-container-lowest}"
    textColor: "{color.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
  input-placeholder:
    textColor: "{color.outline-variant}"
  focus-ring:
    backgroundColor: "{color.primary-outline}"
  menu:
    backgroundColor: "{color.surface-container-lowest}"
    rounded: "{rounded.lg}"
  menu-item:
    textColor: "{color.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
  menu-item-hover:
    backgroundColor: "{color.surface-container-low}"
  link:
    textColor: "{color.on-surface}"
    typography: "{typography.body-md}"
  link-hover:
    textColor: "{color.primary-text}"
  table-header:
    textColor: "{color.on-surface-variant}"
    typography: "{typography.label-sm}"
  table-cell:
    textColor: "{color.on-surface}"
    typography: "{typography.body-md}"
  file-card:
    backgroundColor: "{color.surface-container-lowest}"
    textColor: "{color.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
  file-card-hover:
    backgroundColor: "{color.surface-container-low}"
  file-card-pressed:
    backgroundColor: "{color.surface-container}"
  candidate-list:
    backgroundColor: "{color.surface-panel}"
    rounded: "{rounded.md}"
  preview:
    backgroundColor: "{color.surface-container-lowest}"
    textColor: "{color.on-surface}"
    typography: "{typography.label-lg}"
  tooltip:
    backgroundColor: "{color.inverse-surface}"
    textColor: "{color.inverse-on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
  divider:
    backgroundColor: "{color.outline}"
  scrollbar:
    backgroundColor: "{color.outline}"
  state-icon-warning:
    textColor: "{color.warning}"
  state-icon-error:
    textColor: "{color.error}"
  cv-count:
    textColor: "{color.on-surface-subtle}"
    typography: "{typography.label-md}"
  progress-line-shimmer:
    backgroundColor: "{color.surface}"
    textColor: "{color.on-surface-shimmer}"
    typography: "{typography.label-lg}"
  progress-line:
    backgroundColor: "{color.surface}"
    textColor: "{color.on-surface}"
    typography: "{typography.label-lg}"
  progress-line-step:
    textColor: "{color.on-surface-variant}"
    typography: "{typography.body-sm}"
  progress-line-glyph-settled:
    textColor: "{color.outline-variant}"
  empty-state-headline:
    textColor: "{color.on-surface}"
    typography: "{typography.display-light}"
  empty-state-highlight:
    textColor: "{color.on-surface}"
    typography: "{typography.display}"
  empty-state-frame:
    backgroundColor: "{color.primary}"
  cursor-grid:
    backgroundColor: "{color.primary}"
  answer-text:
    textColor: "{color.on-surface}"
    typography: "{typography.body-md}"
  answer-heading:
    textColor: "{color.on-surface}"
    typography: "{typography.headline-md}"
  candidate-name:
    textColor: "{color.on-surface}"
    typography: "{typography.headline-md}"
  candidate-row-name:
    textColor: "{color.on-surface}"
    typography: "{typography.name}"
  candidate-row-detail:
    textColor: "{color.on-surface-variant}"
    typography: "{typography.body-sm}"
  status-title:
    textColor: "{color.on-surface}"
    typography: "{typography.headline-lg}"
  status-text:
    textColor: "{color.on-surface-variant}"
    typography: "{typography.body-md}"
  pdf-pages:
    backgroundColor: "{color.surface-container}"
    textColor: "{color.on-surface-variant}"
    typography: "{typography.body-sm}"
  pdf-icon:
    backgroundColor: "{color.primary}"
    textColor: "{color.on-primary}"
  resize-handle:
    backgroundColor: "{color.outline}"
  resize-handle-active:
    backgroundColor: "{color.outline-variant}"
---

# CV Screener — Design System

## Overview

A screening tool a recruiter keeps open for hours. It should feel like a
quiet, well-made utility: white, black and one mint.
Soft grey page, white containers, almost no borders, no decoration.
Density is moderate: answers are lists and tables that must be scannable,
so type is compact but never cramped. Nothing animates for its own sake,
with one exception: the empty state (Layout), whose entrance and pointer
grid greet the recruiter before the first question and are gone once it is
asked.

This document is the source of truth for the design system's rules: what
each token means, when it is used, which roles each component reads, how
things behave, and why. It holds no values. Every value is a design token in
`tokens/` (W3C Design Tokens, the source of truth for what exists), and this
document names tokens by their ids there (`color.primary`, `shadow.raised`,
`motion.ease-standard`). The front matter holds two things: `imports:`,
which names the design tokens, and `components:`, the contract of which
roles each component reads.

The tokens come in three tiers. The **palette** (`palette.gray-*`,
`palette.mint-*` and the few named values beside them) holds values only
and is never used in code. The **roles** (`color.*`, `typography.*`,
`rounded.*`, `spacing.*`, `shadow.*`, `motion.*`, `breakpoints.*`,
`containers.*`) say what a value is for; the colour roles and shadows take
a value per theme, light and dark. The **components** say which roles each
component of the interface reads. How the tokens reach the code and the
rules that hold the code to them are in `README.md` (Decisions) and
`src/components/README.md`.

### Reading the tokens

Every token id in this document is a path in the design tokens `imports:`
names. The resolver there lists the token files and how the themes apply:
`foundation` (the palette and raw values) and `semantic` (roles that are
the same in every theme) always, then the `theme` modifier, `light` by
default or `dark`. So `color.surface` is found in
`tokens/themes/light.tokens.json` and `tokens/themes/dark.tokens.json`,
each time as an alias into the palette (`{palette.gray-background}`, in
`tokens/foundation/colors.tokens.json`) or, for a derived role, as the
value its rule gives, the rule itself in the token's `$extensions`. The
colour roles and shadows are the only tokens that change with the theme.

Where the kind is clear from the sentence, the prose names a role by its
bare name: `surface` is `color.surface`, `label-lg` is
`typography.label-lg`. In code the same name is the Tailwind class:
`color.surface` is `bg-surface` or `text-surface`, `typography.body-md` is
`text-body-md` (the whole style: size, line height, weight and letter
spacing), `rounded.md` is `rounded-md`, `shadow.raised` is `shadow-raised`,
`motion.ease-standard` is `ease-standard`; the palette has no class.

## Colors

The palette is three colours: white, black and mint. Every other value is
a tone between them.

Code never reads the palette: a colour on screen is always a role, and a
role points to one palette entry in each theme, or is derived (below). The
palette (`palette.*`) was generated with the Radix Colors custom palette
generator from three seeds per theme; the seeds and the generator's version
are recorded with the palette in `tokens/foundation/colors.tokens.json`, so
it can be generated again. `palette.gray-*` and `palette.mint-*` are its
twelve steps, `gray-background` its page colour and `mint-contrast` its
text colour on step 9; the `-dark` scales are the dark theme's. `white`,
`gold` and `red` are not from the seeds. The Radix step anatomy decides the
step a role takes: 1–2 backgrounds, 3–5 component fills, 6–8 borders,
9–10 solid fills, 11–12 text. A colour the interface needs and no role
gives is a new role first; a value no step gives is a new seed or a
derived role, never a hand-picked colour.

Roles are named by what they do. `surface` is the page and `on-surface`
what sits on it; a `-container` is a fill that separates a region from what
is under it; `outline` draws edges; `primary` is the one accent; `inverse`
reverses light and dark. The names echo a common convention, but the
meanings are the ones given here.

- **Surface** (`color.surface`): the page background. Near-white, never
  pure white.
- **Surface container lowest** (`color.surface-container-lowest`): the fill
  of a thing that floats on the page: inputs, menus, the composer, file
  cards, the CV preview and its pages. Pure white in light. In dark it is
  one step *lighter* than `surface`, not darker: containers rise above the
  page in both themes.
- **Surface container low / container / high / highest**
  (`color.surface-container-low` … `color.surface-container-highest`): four
  ascending fills for controls and their states.
- **Surface panel** (`color.surface-panel`): a quiet region that groups
  related rows on the page, a shade lighter than `surface-container-low`.
  Derived: low mixed over `surface`, by the share its token's rule gives.
- **Outline** (`color.outline`): every edge, divider and scrollbar thumb.
  There is one edge colour, kept faint: an edge separates, it never frames.
- **Outline variant** (`color.outline-variant`): the strongest neutral that
  is not text: a disabled icon, a placeholder, a handle being dragged. Marks
  what is inactive or in transit.
- **On surface** (`color.on-surface`): body text. Not pure black.
- **On surface variant** (`color.on-surface-variant`): secondary text:
  metadata, captions, icons at rest, disabled text.
- **On surface subtle** (`color.on-surface-subtle`): a tertiary label that
  should be read last. Derived: `on-surface-variant` mixed over `surface`,
  fainter than it, by the share its token's rule gives.
- **On surface shimmer** (`color.on-surface-shimmer`): the faded ink at
  either end of the band that sweeps a working progress line. Derived:
  `on-surface` over `surface`, at the smallest share that still meets
  WCAG 2.1 SC 1.4.3 (4.5:1) on `surface` in both themes, so the label stays
  readable wherever the band is.
- **Primary** (`color.primary`): mint, the only chromatic colour: the
  primary action and the marks of the brand (see Do's and Don'ts). Never
  for text blocks, content backgrounds or decoration.
- **Primary hover / pressed** (`color.primary-hover`,
  `color.primary-pressed`): `primary` with its OKLCH lightness lowered, same
  hue and chroma; pressed moves twice as far as hover. Each step is in its
  token's rule. Radix's step 10 is too close to step 9 for this bright
  accent to read as a hover.
- **On primary** (`color.on-primary`): text and icons on `primary`: mint is
  too light for white text.
- **Primary outline** (`color.primary-outline`): the focus ring.
- **Primary text** (`color.primary-text`): the accent as text or an icon on
  a surface; mint itself is too light to read on the page.
- **Primary container / on primary container** (`color.primary-container`,
  `color.on-primary-container`): a light mint tint and the text on it: the
  recruiter's question.
- **Inverse surface / inverse on surface** (`color.inverse-surface`,
  `color.inverse-on-surface`): a surface in the opposite theme and its
  text: tooltips.
- **Warning / error** (`color.warning`, `color.error`): state icons only.
  Never a background, never running text.

A text or icon role is made for the surfaces it is paired with here, and
for no other:

- `on-surface` and `on-surface-variant`: on `surface`, every
  `surface-container-*` and `surface-panel`.
- `on-surface-subtle`: on `surface`, for a label read last; never for
  anything a recruiter must read to act.
- `on-surface-shimmer`: on `surface`, for the shimmer band's faded ends
  only; never for text at rest.
- `on-primary`: on `primary`, `primary-hover` and `primary-pressed`, and
  nothing else sits on those three.
- `on-primary-container`: on `primary-container` only.
- `inverse-on-surface`: on `inverse-surface` only.
- `primary-text`, `warning` and `error`: on `surface` and the containers.
- `outline-variant`: never for text that carries information.

Contrast follows WCAG 2.1 AA in both themes: text 4.5:1 against what it
sits on; icons, the edges a control needs to be seen and the focus ring
3:1 (1.4.11); disabled controls are exempt. `npm run design:lint` checks
every text and fill pair the components name, in both themes, from the
tokens. Three roles do not meet their threshold yet and are open work:
`on-surface-subtle` as the CV count in light, `outline-variant` as the
placeholder, and `primary-outline` as the focus ring on white containers.

An interaction state moves one tonal step and changes nothing else: a
neutral control goes from `surface-container` to `surface-container-high`
on hover and `surface-container-highest` while pressed; a ghost control
shows `surface-container-low` on hover and `surface-container-high` while
pressed; a primary action takes `primary-hover`, then `primary-pressed`. A
disabled control takes `surface-container` with `on-surface-variant` text,
or `outline-variant` for a bare icon, and has no hover. Keyboard focus, and
only keyboard focus, draws `primary-outline`.

Only the colour roles and shadows change with the theme, and a role means
the same in both: the dark value is chosen to keep the meaning, not by
inverting the light one. A derived role is a plain colour in each theme,
as hover and pressed are in every major design system; its rule travels
with the token (in its `$extensions`), and the export refuses a value that
is not what the rule gives from that theme's roles.

## Typography

One family, Google Sans (SIL OFL), self-hosted. Two working weights,
`font.weight.400` and `font.weight.500`; `font.weight.600` only when a
single element must dominate: the logo, the empty-state headline and a
candidate's name in an answer row. One light weight, `font.weight.300`, for
the headline's leading words alone, from Google Sans Flex, the family's
variable cut (Google Sans itself is served from `font.weight.400` up). No
italics.

- **display / display-light:** the empty-state headline only; the one large
  line a recruiter sees before the first question: the leading words in
  `display-light`, the highlighted phrase in `display`, so the
  weight lands where the highlight is.
- **headline-lg / headline-md:** page and section titles, one-line summaries.
- **body-lg:** primary input text.
- **body-md:** running text, list items, table cells.
- **body-sm:** secondary lines, metadata and menu rows.
- **label-lg / label-md / label-sm:** buttons, tooltips, section headers
  (label-sm uppercase, letter-spaced).
- **name:** a candidate's name in an answer row: one step above label-lg
  and at the dominant weight, so the name leads the row.
- **wordmark / mark:** the logo only: the product name uppercase, at the
  dominant weight and widely letter-spaced; the "CV" letters of the mark,
  at the same weight.

A text style is one unit: its size, line height, weight and letter spacing
travel together. The one sanctioned mix is a line height or letter spacing
borrowed from another style to align with it (a table's row header on the
cells' line height, the CV count letter-spaced as `label-sm`).

Lines are never justified. Prefer lists and tables over paragraphs.

## Layout

Single-column layout: the conversation, padded with `spacing.gutter`, with
the message column capped at `containers.reading` and the composer centred
on it at `containers.composer`, wider than the reading column by the same
amount on each side; the header's logo
and toggle sit on a wider column of their own, `containers.header`, so on a
wide screen they frame the content without drifting to the edges or
crowding it. All spacing is a multiple of half `spacing.base`; whole steps
are the default, half steps fine-tune small controls. Rows inside a list
sit close together; blocks are separated generously, so density and
clarity coexist.

Breakpoints: `breakpoints.sm`, `md`, `lg` and `xl`.

Motion is functional only: `motion.duration-short`, and
`motion.duration-medium` at most. Easings: `motion.ease-standard`;
`motion.ease-decelerate` for entering elements; `motion.ease-accelerate`
for leaving ones; and one spring, `motion.ease-overshoot`, for the colour
mode toggle's icon alone (`motion.duration-color-mode-turn`).
Loading motion is the one exception: the progress line breathes (an
opacity cycle of `motion.duration-breath` on its glyph) and one band of ink
sweeps its label every `motion.duration-shimmer`, from `on-surface-shimmer`
to `on-surface` and back, both off under reduced
motion. Following a response scrolls smoothly, never under reduced motion.

The empty state is the one place motion is decorative. It enters once per
page load, each part fading up `motion.distance-entrance` over
`motion.duration-entrance`: the headline word by word,
`motion.stagger-entrance-word` apart, "Candidates" last with its frame
fading in around it; then the composer and the CV count,
`motion.stagger-entrance` apart. Slower than functional motion on purpose,
with its own gentler ease-out, `motion.ease-entrance`: it is seen once and
sets the tone. The composer is ready from the first frame, focused by a
click or Tab. Afterwards the frame slides to whichever word is in focus and
the words out of focus blur by `motion.blur-out-of-focus`, both over
`motion.duration-focus-move`, and the composer's placeholder types the
example questions (Components: Composer). Under reduced motion everything
appears at once, sharp and still.

Behind the empty state, an invisible lattice of rounded cells lights up in
`primary` hairlines (thinner in dark, where mint on near-black reads
stronger; `--cursor-grid-line-width` in `src/styles/theme.template.css`)
around the pointer and fades out
after it leaves; a click sends a ring of lit cells outward. Nothing is
drawn until the pointer moves; no lit cell is drawn over the headline block
or the composer (with a small margin around them), it never blocks the
content above it, and it is off under reduced motion.

## Elevation & Depth

Depth is tonal first: `surface` → `surface-container-lowest` →
`surface-container` → `surface-container-high`. Shadows exist in three
places only, each a black shadow at the opacity its token gives:
floating input containers use `shadow.raised`, menus use
`shadow.overlay`, and the file card uses `shadow.soft`, which it
loses while pressed, so the press reads as the card meeting the page. Each
shadow is stronger in the dark theme, since the light opacities are
invisible on dark surfaces. The sticky header casts no shadow and has no
border: a short gradient from `surface` to transparent below it
(`AppHeader.tsx`) fades the
conversation out as it passes underneath.

## Shapes

Soft, with pill-shaped actions. Buttons use `rounded.full`. The largest
floating container and the question use `rounded.xl`; menus `rounded.lg`;
inputs, containers and tooltips `rounded.md`; menu rows and small controls
`rounded.sm`. Links are plain text with an underline, never chips.

## Components

Each component token above names the roles a component reads; the code
styles the component with those roles (a recipe cites its tokens, and the
lint holds the classes to them). The code owns component sizes; this
document names the file, never the number. Which libraries components use
and how states are selected is in `src/components/README.md`. Icons take
one size in text and in `xs` buttons and one step larger in other buttons
(`Button.recipe.ts`).

- **Logo:** the mark is "CV" in `mark` on a `primary` square
  (`LogoMark.tsx`), `rounded.sm`: the letters are traced from the font as outlines and centred
  on their bounding box, so no font has to load and
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
  pressed. Three heights, `xs` below `sm` below `md` (`Button.recipe.ts`).
- **Icons:** `on-surface-variant` at rest, `on-surface` on hover,
  `outline-variant` when disabled; beside a headline (a candidate's name),
  the size of a button's icon (`CandidateName.tsx`).
- **Colour mode toggle:** a `md` ghost icon button in the header, Moon in
  light and Sun in dark, its icon the one larger than other buttons' icons,
  so the switch reads at a glance (`ColorModeButton.tsx`). On a switch the
  icon turns: the leaving one rotates, shrinks and fades while the arriving
  one rotates in from the other side, grows and settles a little past its
  mark (`motion.duration-color-mode-turn`, `motion.ease-overshoot`); under
  reduced motion the swap is immediate. A press plays a short light-switch
  click: synthesized, a few tens of milliseconds, quiet, a snap of
  band-limited noise over a low thock; the
  click for "on" (to light) sits above the one for "off" (to dark), so the
  direction is audible. It is the interface's only sound; nothing plays on
  load, on hover or on focus. The frequencies and durations live in the code
  beside this rule (`switchClick.ts`).
- **Inputs:** no border at rest when placed on `surface`; the background
  step separates them. Focus: a `primary-outline` ring (`focusVisibleRing`
  in `src/components/ui/recipe.ts`).
- **Composer:** the largest floating container: `surface-container-lowest`
  with an `outline` border, `rounded.xl`, raised shadow, padded
  (`ChatComposer.tsx`); the border is what separates it from `surface` at
  rest, three tones away. With one model offered (this phase), one row: the
  text input, at least two lines tall, then audio-lines and a circular
  primary send button that becomes Stop while a request runs, aligned to
  the input's last line. With a choice of models, the input has its own
  row, then a bottom row: the model chip on
  the left, the same actions on the right. Audio-lines is disabled, with
  the tooltip "Voice mode coming soon…" above it. The input grows with the
  question up to a maximum height, then scrolls. In the empty state the
  placeholder is typed: the example questions one after another, each
  typed, held, deleted faster than it was typed, then a pause before the
  next (`TYPING` in `typewriter.ts`), in `input-placeholder` and `body-lg`
  where typed text will sit, with a hairline bar cursor one line tall
  blinking every `motion.duration-blink` (`TypedPlaceholder.tsx`); it goes as soon as the field is focused or holds
  text, and returns when the field is empty and unfocused again, so the
  empty state's field does not take focus on load. In the conversation the
  placeholder is still ("Ask about the candidate pool"). Under reduced
  motion the first example question shows still, no cursor.
  Centred in the empty state; after the first question it sits at the bottom
  of the conversation, wider than the message column by the same amount
  on each side (`containers.composer`, `containers.reading`).
- **Question:** the recruiter's question sits right-aligned on
  `primary-container`, `rounded.xl` (half the one-line height, so a single
  line has fully round ends and a single character is a circle), at least
  as wide as it is tall and at most `containers.question` wide.
  Answer text stays unboxed; a candidate list sits on a panel (Answer views).
- **Model menu:** the model chip (`surface-container`, `rounded.full`) shows
  the vendor logo, the model name and a chevron, with the tooltip "Change
  model". Its menu lists the answer
  models, each with vendor logo and name, and follows the menu rules.
- **Menus:** white panel with the overlay shadow and a little more inner
  padding than a row's own; rows in `body-sm`, `rounded.sm`; hover is
  `surface-container-low`; the selected row keeps no background and is
  marked only by a `primary-text` check icon.
- **Links:** `on-surface` with underline; hover `primary-text`.
- **File card:** the one card in the interface, for a CV that opens: one
  line with the PDF icon (its document in `on-surface`, its download
  badge in solid `primary` with an `on-primary` arrow, like the logo mark, a
  thing, not a text block), the candidate's name in `label-lg` and
  "Resume" in `body-sm` `on-surface-variant`; `surface-container-lowest`
  with an `outline` border, the soft shadow, `rounded.md`, as wide as its
  label (a long name cut with an ellipsis). A tooltip reads "Preview
  resume". Hover is `surface-container-low`; pressed goes one tone further,
  `surface-container`, without the shadow; both transition. Inside an
  answer view, where the name is already shown beside it, the card is
  compact: a smaller icon and "Resume" only (`CvSourceLink.tsx`), with the
  padding of a text
  line, so it sits at the height of the row's text.
- **CV preview:** a file card opens the CV in a panel docked to the right
  edge, full height, `surface-container-lowest` with an `outline` left edge
  and no shadow: the CV's pages drawn one under another on
  `surface-container`, each page on `surface-container-lowest` with the
  raised shadow and a gutter between them (`PdfPages.tsx`), under a header
  (`CvPreview.tsx`) with the PDF
  icon, the file name in `label-lg`, and ghost icon buttons Download and
  Close; while the pages load, a spinner and "Loading the CV…" sit in the
  middle. It opens at a set share of the viewport, never narrower than
  `containers.preview`, and is dragged wider or narrower by its left edge,
  from `containers.preview-min` up to a set share of the viewport, never
  more (the conversation keeps the rest); both shares are named in
  `panelWidth.ts`. The handle is a `divider` line that fills to
  `outline-variant` on hover and while dragging. Below `lg` it fills the
  screen instead, with the same header and no handle. Escape closes it.
- **Answer text:** the answer as the model wrote it, appearing once it is
  written: paragraphs and bullet or numbered lists in `body-md`
  `on-surface`, list markers in `on-surface-variant`, candidate names in
  bold at the label weight; no headings, tables or links. When the answer
  is about candidates, an answer view follows it once complete, and the
  CVs appear as file cards inside the view, never in a separate row.
- **Answer views:** the data under an answer, drawn from the CVs rather
  than written by the model; one per answer. The comparison and the
  profile are unboxed like the text; the candidate list sits on a panel.
  - **Candidate list:** a panel (`candidate-list`: `surface-panel`, a
    shade lighter than the low surface itself;
    `rounded.md`, padded `spacing.base` × 4) that holds the whole answer,
    so its rows read as one group apart from the conversation and the
    white file cards read as files on it: an opening sentence in `body-md`
    `on-surface` composed by the app from the search ("There are 7
    candidates with React experience. Here are their details."), then one
    compact row per candidate on four lines, the lower three indented to
    the name: a person icon (`AnswerCandidates.tsx`) and the name in
    `name`; the title from
    the CV in `body-sm` `on-surface-variant`; the years of the skills
    asked about in `body-sm` with tabular figures; the compact file card,
    shifted left by its own padding and border so its icon sits on the
    text column, not its edge. Rows fill two columns from `sm` and one
    below it, each with `spacing.base` × 2.5 above and below it (rows
    `spacing.base` × 5 apart, as in Lists), so the panel's width is used.
    Four rows, a full pair of columns, show by default; a control centred
    under them inside the panel, in the compact file card's style (white
    on the grey, `label-md`), "Show all 7" with a chevron down, reveals
    the rest and becomes "Show fewer" with a chevron up. The rest unfold
    over `motion.duration-medium` (`motion.ease-decelerate`) and fold over
    `motion.duration-short` (`motion.ease-accelerate`), fading with
    the height, and are clipped only until they have unfolded, so a file
    card's tooltip on the last row is not cut off; never under reduced
    motion. A ranked list leads each row with its number in `label-md`
    `on-surface-variant`, has no opening sentence, and keeps the model's
    reason under each row in `body-sm` `on-surface-variant`.
  - **Comparison:** a table with one column per candidate, the name in
    `label-lg` over its compact file card as the column header, and the
    criteria in the first column in `label-sm` uppercase
    `on-surface-variant`.
  - **Profile:** the answer to a question about one candidate, whether
    named ("Summarize Jane Doe's profile", "Where did Lena work last?") or
    the one their criteria match ("Who is the mobile engineer?"): the
    model's two or three sentences on what was asked, then only the name
    in `headline-md` behind a person icon with the compact file card, and
    one `body-md` `on-surface-variant` line with title, location and
    total years. Nothing more: the details are in the CV. When the model
    wrote no sentence, the app's ("There is 1 candidate in a mobile role.
    Here is their CV.") opens it.
- **Lists:** rows separated by whitespace (`spacing.base` × 5), never by a
  rule or a coloured background.
- **Scrollbars:** thin, with a transparent track and an `outline` thumb:
  visible on a careful look, never competing with content.
- **Tables:** header in `label-sm` `on-surface-variant`; cells `body-md`;
  horizontal rules only, no vertical rules, no zebra striping.
- **Tooltips:** a short label on `inverse-surface` with `inverse-on-surface`
  text, `label-md`, `rounded.md`. Fades in on hover after a short delay
  (`OPEN_DELAY_MS` in `Tooltip.tsx`) and at once on
  keyboard focus; Escape closes it, and so does pressing the control. A
  control whose own menu is open shows none.
- **Empty state:** the headline "Find The Right Candidates" on one line,
  title case: "Find The Right" in `display-light`, "Candidates" in
  `display`, wrapping only when the column is narrower than the line. One
  word is in focus: "Candidates", unless the pointer is over another word,
  then that word. A frame marks the focused word: four `primary` corner
  squares with heavy strokes, set just outside the word's box, no glow
  (`ChatEmptyState.tsx`); it slides and resizes to the focused word
  (`motion.duration-focus-move`, `motion.ease-standard`). The other words
  blur by `motion.blur-out-of-focus` over the same duration; the focused
  one is sharp. Under reduced motion nothing blurs or moves. Below the
  headline the composer, its placeholder typing the example questions in
  turn (Composer); closer under the composer (`ChatScreen.tsx`)
  the CV count as a quiet label (`cv-count`): `label-md` in capitals,
  letter-spaced as `label-sm`, in `on-surface-subtle`, "30 CVs TO REVIEW" with the
  s of CVs small (1 CV in the singular). No suggested-question buttons.
- **States:** an error is a single line of text with a small leading icon
  in `error` and a Retry action. No match, not enough information and
  outside the pool are the answer's own words behind a small leading icon
  (`on-surface-variant`; `warning` for not enough information), each named
  for screen readers ("No match", "Not enough information", "Outside the
  pool"); never a filled or bordered box.
- **Progress line:** one `label-lg` line with a sparkle glyph, between the
  question and the answer: the glyph breathes and a band of ink sweeps the
  label while the current step runs (Layout: loading motion); once answered
  it settles into what the search did ("Matched 7 of 30 CVs", "Read 2 CVs",
  or "Answered" when no CV was searched) in `on-surface-variant`, in plain
  words for a non-technical reader, followed by "· answered by <model>" when
  the fallback model answered; after Stop into "Stopped searching", after an
  error into "The search didn't finish". No clock.

## Do's and Don'ts

- Do keep solid mint (`primary`) for interaction, the logo mark and the PDF
  icon's badge only; if more than one solid mint element competes for
  attention, something is wrong. The mint tint (`primary-container`) marks
  the recruiter's question only.
- Do use a tonal step before a border, and a border before a shadow.
- Don't render states as filled or bordered boxes.
- Don't box answer text; only the question sits on a tint, and only a
  candidate list sits on a panel. No gradients, emoji or decorative
  illustration.
- Don't wrap content in cards; whitespace is the container. The file card
  is the exception: it is the file, not a container for content.
- Every colour, size and radius on screen traces to a token in `tokens/`;
  code never reads the palette, and never makes a colour by opacity: a new
  tint is a derived role in the tokens first.
- Don't add a second accent for any purpose.
- Don't use weights above `font.weight.500` for running text.
