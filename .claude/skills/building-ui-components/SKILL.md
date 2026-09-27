---
name: building-ui-components
description: The procedure for any UI work in this repository: a new component, view, panel, screen or hook, a new variant or state on an existing one, or a visual change. Reads the design system before the code, walks the component conventions in order, and closes with the checks that catch drift. Use it whenever the task touches src/components, src/hooks, src/app or a story, even when the user says "just a small style tweak", "add a button", "change the colour" or does not mention design at all.
paths: src/components/**,src/hooks/**,src/app/**,.storybook/**
---

# Building UI in this codebase

The design system has two sources: the design tokens in `design-system/tokens/` (every
value) and `DESIGN.md` (the rules: what each token means, which roles each
component reads, and why). The code must trace to both: every colour, size
and radius on screen is a token, every component follows one shape. Lint rules and hooks catch a class outside the tokens
after the fact; this procedure keeps the work inside them from the start,
so the lint has nothing to say. Each fact below lives in one owning file;
this skill points at it and never restates it.

## Before writing anything

1. Read the `DESIGN.md` section for what you are about to build (Components,
   then Colors, Typography, Layout, States, Do's and Don'ts). If the element
   is not described there, stop: `DESIGN.md` changes first, and that is an
   ask-first change (`AGENTS.md`, Boundaries).
2. Read `src/components/README.md` once per session. It owns how a component
   gets from the document to the screen: the two kinds of component, the
   four-file folder, recipes, props, states, stories.
3. Check the PRD use case the UI serves (`docs/PRD.md`, §5, §7, §10). A view
   that is not asked for there is out of scope.
4. Look at the nearest existing example before inventing a shape; the list is
   in [references/examples.md](references/examples.md). Compose existing
   primitives before adding one: a part used by a single component stays in
   that component's folder.

## Decide the kind

- **Primitive** (`src/components/ui/`): knows nothing about candidates or
  answers; takes children and variants; behaviour from Headless UI when it
  has the component.
- **Product component** (folder beside `ui/`): knows the domain; composes
  primitives; its data comes typed from `@/contracts`, never from a local
  shape.
- **Hook** (`src/hooks/use<Name>/`): one concern; the pure logic in its own
  file with unit tests, the hook only binds it to React.

## Build, in this order

```
- [ ] Folder and files named after the component: <Name>.tsx, <Name>.recipe.ts, <Name>.stories.tsx, index.ts
- [ ] Recipe first: defineRecipe / defineSlotRecipe, token utilities only, opening comment naming the DESIGN.md tokens in backticks
- [ ] Props: extend the element's or Headless UI's props minus what the component decides, plus RecipeVariantProps; className passed last, layout classes only
- [ ] States through real states: enabled:hover:, enabled:active:, focus-visible: (focusVisibleRing), disabled:, aria-expanded:, data-closed; keyboard-only affordances behind useInteractionModality
- [ ] Motion: functional, `motion.duration-short` to `-medium`, easings and durations from the motion tokens; nothing decorative outside the empty state; off under usePrefersReducedMotion
- [ ] Accessibility: the element that has the semantics (button, not div); aria-hidden on decorative icons; a screen-reader label for a state shown by an icon; role="alert" on an error
- [ ] Stories: title from the folder (UI / Name, Chat / Name); Basic plus a variant table built from the recipe's own variants object; product stories use src/mocks
- [ ] index.ts lists exports by name, values and types
```

Why the order: the recipe fixes the vocabulary, so the component cannot
drift while it is written; the story renders every state in light and dark
before the component is wired into a screen.

## What the tokens allow

Colour, text style, radius, shadow, easing, duration and animation come
only from the design tokens (`bg-surface`, `text-body-md`, `rounded-md`,
`shadow-soft`, `ease-decelerate`, `duration-(--motion-duration-short)`). A
text style is one class; a documented override reads the other style's part
(`leading-(--text-label-lg--line-height)`). No opacity modifier on a token
(`bg-primary/10`) and no palette variable (`--palette-*`): code reads roles.
Layout numbers (`p-4`, `gap-2`, `w-full`, `grid-rows-[1fr]`) are the code's.
Tailwind's own palette and scale (`bg-red-500`, `text-xl`, `font-bold`,
`shadow-lg`, `rounded-2xl`) do not exist here; a missing token is a
`design-system/tokens/` and `DESIGN.md` conversation, not an arbitrary value.

## Close the loop

Run, and fix until each is clean, before saying the work is done:

```bash
npm run lint:strict
```

```bash
npm run typecheck && npm test
```

```bash
npm run storybook
```

Open the new story in light and in dark and read the accessibility panel: it
fails the story on a violation. For a change to `design-system/tokens/`, `DESIGN.md` or
`src/styles/theme.template.css`, also `npm run design:export` and
`npm run design:lint`; never edit a generated stylesheet. The hooks in `.claude/settings.json` run the strict
lint on every edited file and before a commit, so an error here is one you
would have met anyway.

## Finishing

A new script goes into the `AGENTS.md` Commands table; a new convention into
`src/components/README.md`; a new visual rule into `DESIGN.md`, asked first.
Commit message `type: subject`, shown before committing.
