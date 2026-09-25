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
    lineHeight: "1.5"
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
  name:
    fontFamily: Google Sans
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: "1.2"
  display:
    fontFamily: Google Sans
    fontSize: 5rem
    fontWeight: 600
    lineHeight: "1.1"
    letterSpacing: -0.025em
  display-light:
    fontFamily: Google Sans Flex
    fontSize: 5rem
    fontWeight: 300
    lineHeight: "1.1"
    letterSpacing: -0.025em
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
    textColor: "{colors.outline-variant}"
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
  candidate-list:
    backgroundColor: "{colors.surface-container-low}"
    rounded: "{rounded.md}"
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
so type is compact but never cramped. Nothing animates for its own sake,
with one exception: the empty state (Layout), whose entrance and pointer
grid greet the recruiter before the first question and are gone once it is
asked.

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
  the primary action, the logo mark, the band of the PDF icon, the
  strokes of the empty-state grid and the corners of the frame on the
  empty-state headline. Never for text blocks, content backgrounds or other
  decoration.
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
500; 600 only when a single element must dominate: the logo, the
empty-state headline and a candidate's name in an answer row. One light
weight, 300, for the headline's leading words alone, from Google Sans Flex,
the family's variable cut (Google Sans itself is served from 400 up). No
italics.

- **display / display-light:** the empty-state headline only; the one large
  line a recruiter sees before the first question: the leading words in
  `display-light` (300), the highlighted phrase in `display` (600), so the
  weight lands where the highlight is.
- **headline-lg / headline-md:** page and section titles, one-line summaries.
- **body-lg:** primary input text.
- **body-md:** running text, list items, table cells.
- **body-sm:** secondary lines, metadata and menu rows.
- **label-lg / label-md / label-sm:** buttons, tooltips, section headers
  (label-sm uppercase, letter-spaced).
- **name:** a candidate's name in an answer row: one step above label-lg
  and 600, so the name leads the row.
- **wordmark / mark:** the logo only: the product name uppercase, 600 and
  widely letter-spaced; the "CV" letters of the mark, 600.

Lines are never justified. Prefer lists and tables over paragraphs.

## Layout

Single-column layout: the conversation, padded with `spacing.gutter`, with
the message column capped at a comfortable reading width and the composer
centred on it, 1rem wider on each side; the header's logo and toggle sit on
a wider column of their own, 104rem, so on a wide screen they frame the
content without drifting to the edges or crowding it. All spacing is a multiple of half
`spacing.base` (0.125rem); whole steps are the default, half steps fine-tune
small controls. Rows inside a list sit close together; blocks
are separated generously, so density and clarity coexist.

Breakpoints: sm 40rem, md 48rem, lg 64rem, xl 80rem.

Motion is functional only, 150–200ms. Easings: standard
`cubic-bezier(0.2, 0, 0, 1)`, decelerate `cubic-bezier(0, 0, 0, 1)` for
entering elements, accelerate `cubic-bezier(0.3, 0, 1, 1)` for leaving ones,
and one spring, overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)`, for the
colour mode toggle's icon alone (280ms).
Loading motion is the one exception: the progress line breathes (a 1.6s
opacity cycle on its glyph) and one band of ink sweeps its label every
1.8s, both off under reduced motion; the values live in
`src/styles/theme.css`. Following a response scrolls smoothly, never under
reduced motion.

The empty state is the one place motion is decorative. It enters once per
page load, each part fading up 24px (600ms): the headline word by word,
100ms apart, "Candidates" last with its frame fading in around it; then the
composer and the CV count, 120ms apart. Slower than functional motion on
purpose, with its own gentler ease-out: it is seen once and sets the tone.
The composer is ready from the first frame, focused by a click or Tab. Afterwards the frame slides
to whichever word is in focus (500ms) and the words out of focus blur
(500ms), and the composer's placeholder types the example questions
(Components: Composer). Under reduced motion everything appears at once,
sharp and still.

Behind the empty state,
an invisible lattice of rounded cells lights up in `primary` hairlines
(1px in light, 0.5px in dark) around the pointer and fades out after it leaves; a click sends a ring of
lit cells outward. Nothing is drawn until the pointer moves; no lit cell
is drawn over the headline block or the composer (with a small margin
around them), it never blocks the content above it, and it is off under
reduced motion.

## Elevation & Depth

Depth is tonal first: `surface` → `surface-container-lowest` →
`surface-container` → `surface-container-high`. Shadows exist in three
places only: floating input containers use raised
(`0 0.25rem 1.5rem rgba(0, 0, 0, 0.10)`), menus use overlay
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
  pressed. Sizes: `xs` 1.875rem, `sm` 2rem, `md` 2.25rem tall.
- **Icons:** `on-surface-variant` at rest, `on-surface` on hover, `outline-variant` when disabled; 1.25rem beside a headline (a candidate's name).
- **Colour mode toggle:** a `md` ghost icon button in the header, Moon in
  light and Sun in dark, its icon 1.5rem: the one icon larger than the
  1.25rem of other buttons, so the switch reads at a glance. On a switch
  the icon turns: the leaving one rotates 45°, shrinks to half and fades
  while the arriving one rotates in from the other side, grows and settles
  a little past its mark (280ms, the overshoot easing); under reduced
  motion the swap is immediate. A press plays a short light-switch click: synthesized,
  under 60 ms, quiet, a snap of band-limited noise over a low thock; the
  click for "on" (to light) sits above the one for "off" (to dark), so the
  direction is audible. It is the interface's only sound; nothing plays on
  load, on hover or on focus. The frequencies and durations live in the code
  beside this rule (`switchClick.ts`).
- **Inputs:** no border at rest when placed on `surface`; the background
  step separates them. Focus: 2px `primary-outline` ring.
- **Composer:** the largest floating container: `surface-container-lowest`
  with an `outline` border, `rounded.xl`, raised shadow, padded 1rem; the
  border is what separates it from `surface` at rest, three tones away. With one model offered (this
  phase), one row: the text input, at least two lines tall (3.5rem), then
  audio-lines and a circular primary send button that becomes Stop while a
  request runs, aligned to the input's last line. With a choice of models, the input has its own row with a 0.625rem
  bottom margin, then a 0.625rem gap to a bottom row: the model chip on
  the left, the same actions on the right. Audio-lines is disabled, with
  the tooltip "Voice mode coming soon…" above it. The input grows with the
  question up to a maximum height, then scrolls. In the empty state the
  placeholder is typed: the example questions one after another, each
  character 75ms apart, the full question held 1.5s, deleted at 30ms a
  character, 0.5s empty before the next, in `input-placeholder` and
  `body-lg` where typed text will sit, with a 1px bar cursor one line tall
  blinking once a second; it goes as soon as the field is focused or holds
  text, and returns when the field is empty and unfocused again, so the
  empty state's field does not take focus on load. In the conversation the
  placeholder is still ("Ask about the candidate pool"). Under reduced
  motion the first example question shows still, no cursor.
  Centred in the empty state; after the first question it sits at the bottom
  of the conversation, 1rem wider on each side than the message column.
- **Question:** the recruiter's question sits right-aligned on
  `primary-container`, `rounded.xl` (half the one-line height, so a single
  line has fully round ends and a single character is a circle), at least
  as wide as it is tall and at most 33.75rem (540px) wide.
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
  line with the 1.25rem PDF icon (its document in `on-surface`, its download
  badge in solid `primary` with an `on-primary` arrow, like the logo mark, a
  thing, not a text block), the candidate's name in `label-lg` and
  "Resume" in `body-sm` `on-surface-variant`; `surface-container-lowest`
  with an `outline` border, the soft shadow, `rounded.md`, as wide as its
  label (a long name cut with an ellipsis). A tooltip reads "Preview
  resume". Hover is `surface-container-low`; pressed goes one tone further,
  `surface-container`, without the shadow; both transition. Inside an
  answer view, where the name is already shown beside it, the card is
  compact: the icon at 1rem and "Resume" only, with the padding of a text
  line, so it sits at the height of the row's text.
- **CV preview:** a file card opens the CV in a panel docked to the right
  edge, full height, `surface-container-lowest` with an `outline` left edge
  and no shadow: the CV's pages drawn one under another on
  `surface-container`, each page on `surface-container-lowest` with the
  raised shadow and a gutter of 1rem, under a 4rem header with the PDF
  icon, the file name in `label-lg`, and ghost icon buttons Download and
  Close; while the pages load, a spinner and "Loading the CV…" sit in the
  middle. It opens 30rem wide, is dragged wider or narrower by
  its left edge between 20rem and 70% of the viewport (the conversation
  keeps the rest), and the handle is a `divider` line that fills to
  `outline-variant` on hover and while dragging; it opens at 35% of the
viewport, never under 30rem. Below `lg` it fills the
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
  - **Candidate list:** a panel (`candidate-list`: `surface-container-low`
    at 60% over the page, a shade lighter than the low surface itself;
    `rounded.md`, padded `spacing.base` × 4) that holds the whole answer,
    so its rows read as one group apart from the conversation and the
    white file cards read as files on it: an opening sentence in `body-md`
    `on-surface` composed by the app from the search ("There are 7
    candidates with React experience. Here are their details."), then one
    compact row per candidate on four lines, the lower three indented to
    the name: a 1rem person icon and the name in `name`; the title from
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
    over 200ms (decelerate) and fold over 150ms (accelerate), fading with
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
  text, `label-md`, `rounded.md`. Fades in on hover after 150ms and at once on
  keyboard focus; Escape closes it, and so does pressing the control. A
  control whose own menu is open shows none.
- **Empty state:** the headline "Find The Right Candidates" on one line,
  title case: "Find The Right" in `display-light`, "Candidates" in
  `display`, wrapping only when the column is narrower than the line. One
  word is in focus: "Candidates", unless the pointer is over another word,
  then that word. A frame marks the focused word: four `primary` corners,
  1rem squares with 3px strokes, set 0.5rem outside the word's box, no
  glow; it slides and resizes to the focused word (500ms, standard
  easing). The other words blur 5px (500ms); the focused one is sharp.
  Under reduced motion nothing blurs or moves. 3rem below the headline the
  composer, its placeholder typing the example questions in turn
  (Composer); 1.5rem under the composer
  the CV count as a quiet label: `label-md` in capitals, letter-spaced as
  `label-sm`, in `on-surface-variant` at 70%, "30 CVs TO REVIEW" with the
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
  icon's badge only; if
  more than one solid mint element competes for attention, something is
  wrong. The mint tint (`primary-container`) marks the recruiter's question
  only.
- Do use a tonal step before a border, and a border before a shadow.
- Don't render states as filled or bordered boxes.
- Don't box answer text; only the question sits on a tint, and only a
  candidate list sits on a grey panel. No gradients, emoji or decorative
  illustration.
- Don't wrap content in cards; whitespace is the container. The file card
  is the exception: it is the file, not a container for content.
- Every colour, size and radius on screen traces to a token in this file.
- Don't add a second accent for any purpose.
- Don't use weights above 500 for running text.