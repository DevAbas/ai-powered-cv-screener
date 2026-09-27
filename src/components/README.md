# Components

How the UI is built in code. What it should look like is a different
question, answered once in `DESIGN.md`; this file never repeats a visual
rule, it only says how a component gets from that document to the screen.

## Two kinds of component

`ui/` holds the primitives: Button, Select, Table, Textarea, Tooltip and the
rest. A primitive knows nothing about candidates or answers. It takes
children and variants and renders one element the way `DESIGN.md` describes
it. `ui/Icons/` holds the icons we draw ourselves, such as the PDF file icon;
everything else comes from `lucide-react`. `ui/recipe.ts` holds the two
helpers every primitive's styles are built with.

The folders beside `ui/` are the product components: ChatScreen,
ChatComposer, ChatExchange, CvPreview, the Answer views. They know the
domain and compose primitives into the screens a recruiter uses.

## A component's folder

Each component has a folder named after it, and the files inside carry the
same name:

```
ui/Button/
  Button.tsx           the component
  Button.recipe.ts     its styles
  Button.stories.tsx   its previews
  index.ts             what the folder exports
```

`index.ts` names its exports one by one, values and types, so a reader can
see the folder's surface without opening the other files. A part that only
one component uses lives in that component's folder with its own file and
story, as `ChatExchange/QuestionBubble.tsx` does. It is not promoted to a
primitive until a second component needs it.

Names say what a component is to someone who has never seen the code:
`ChatExchange`, `AnswerProgress`, `CvPreview`. Avoid in-house shorthand.

## Styles are recipes

A component's classes live next to it in `<Name>.recipe.ts`, built with
`defineRecipe` for a single element or `defineSlotRecipe` for a component
with several parts. Both come from `ui/recipe.ts` and wrap
tailwind-variants, so a recipe has the shape that library documents:
`base`, `variants`, `defaultVariants`, `compoundVariants`, and `slots` for
the multi-part case.

```ts
export const buttonRecipe = defineRecipe({
  base: ["inline-flex items-center rounded-full", focusVisibleRing],
  variants: {
    variant: { primary: "bg-primary text-on-primary", secondary: "..." },
    size: { sm: "h-8 px-3", md: "h-9 px-4" },
  },
  defaultVariants: { variant: "secondary", size: "md" },
});
```

The classes in a recipe are token utilities: `bg-surface`,
`text-on-surface-variant`, `rounded-full`, `text-label-md`. They exist
because `npm run design:export` builds them from the design tokens in
`design-system/tokens/` into `src/styles/theme.generated.css`, and
`src/styles/palette-reset.css` removes Tailwind's own palette so nothing
else is available. A text style is one class: `text-label-md` sets the
size, line height, weight and letter spacing together. If a class you want
does not exist, the token does not exist, and the conversation belongs in
`design-system/tokens/` and `DESIGN.md` first.

Every recipe opens with a comment naming, in backticks, the `DESIGN.md`
component tokens it implements, for example `button-primary`,
`button-primary-hover`, `button-disabled`. That comment is how a reviewer
checks the recipe against the design without reading every class, and the
lint holds it to the design: every name must exist, and the recipe must
use, as a class, each role its cited tokens name (`button-primary` names
`color.primary`, so the recipe has `bg-primary`).

We use the lite build of tailwind-variants, which has no tailwind-merge. A
`className` passed to a component is appended, not merged, so it cannot
override a token class already in the recipe. Pass layout classes that way
(`mt-4`, `w-full`), never colours or sizes.

## Props

A component's props type is `<Name>Props`. It extends the props of the
element or Headless UI component it renders, minus what the component
decides itself, and adds the recipe's variant props through
`RecipeVariantProps<typeof recipe>`. The component pulls out the variant
props and `className`, spreads the rest onto the element, and passes
`className` last so it lands at the end of the class list.

```ts
export interface ButtonProps extends Omit<HeadlessButtonProps, "as" | "className">, ButtonBaseProps {
  className?: string | undefined;
}
```

A prop with a default documents it with `@default` in its JSDoc, so the
value shows in the editor and in Storybook without opening the source.

A component with several parts, such as Table, exports each part by its
full name (`TableRoot`, `TableRow`, `TableCell`) and also a namespace from
`namespace.ts`, so callers can write `Table.Root` and `Table.Row`.

## Behaviour and state

Interactive behaviour comes from `@headlessui/react` whenever it has the
component: buttons, listboxes, menus, transitions. When it does not, we write
a small primitive under `ui/`; Tooltip is the example. We do not reimplement
what the library already handles, and we do not add a second component
library.

States are styled through the states the element really has. Hover is
`hover:`, or `enabled:hover:` on a control that can be disabled so a
disabled control never lights up. Keyboard focus is `focus-visible:`, never
`focus:`. Disabled is `disabled:`. Expanded and selected are
`aria-expanded:` and `aria-selected:`, which also keeps the accessibility
tree honest.

A `data-*` attribute is the fallback for a state the platform has no word
for, and the codebase uses three. The active option in a list uses Headless
UI's `data-focus`, shown only while `data-modality="keyboard"`, which
`useInteractionModality` sets from the last input the user touched, so a
mouse user does not see a keyboard highlight. Enter and leave transitions
use `data-closed`. The fourth attribute you will meet, `data-theme` on the
root element, is not a state: it is the colour-mode override that
the Tailwind theme reads.

## CSS outside recipes

Almost none. `src/app/globals.css` imports Tailwind, the palette reset, the
generated tokens and the theme, then holds the few rules that must be global,
such as the scrollbar. Plain CSS there and in `src/styles` reads tokens as
variables, `var(--color-surface)`, and never uses `@apply` on a utility
class.

`src/styles/theme.template.css` is hand-written: the dark variant, the
keyframes and animations, the font wiring. Terrazzo fills its `@tz` rules
with each theme's tokens and writes `theme.generated.css`; it also writes
every token as a `:root` variable into `tokens.generated.css`. Neither
generated file is edited by hand; change `design-system/tokens/` (a value) or the
template (wiring) and run `npm run design:export`.

## What the lint enforces

The rules above that a linter can hold the code to are ESLint rules, in
`scripts/design-lint/rules`, each with its reasons and examples on top and
its tests beside it. `npm run lint` reports them as warnings; `npm run
lint:strict`, the hooks and CI report them as errors, so an agent cannot
pass a lint with a violation in it (`AGENTS.md`, Harness).

- `design/token-classes`: every colour, text, radius, shadow and motion
  class is a design token. The rule reads the token names from
  `theme.generated.css`, so `bg-red-500`, `text-[13px]`,
  `rounded-[6px]`, `font-bold` and `shadow-lg` fail, and the one way to make
  a class legal is a token in `design-system/tokens/`. A modifier on a token class
  (`bg-primary/10`) and a read of the palette (`bg-(--palette-mint-9)`) fail
  too: a new tint is a derived role in the tokens, and code reads roles.
- `design/no-raw-color`: no hex or colour function with literal channels in
  component source; the dark theme cannot reach a literal.
- `design/focus-visible-only`: a ring, outline, border or shadow keys off
  `focus-visible:`, never `focus:` or `focus-within:`. Autofixable.
- `design/no-hover-on-disabled`: on a control that can be disabled, `hover:`
  and `active:` are `enabled:hover:` and `enabled:active:`. Autofixable.
- `design/recipe-cites-tokens`: a recipe's opening comment names `DESIGN.md`
  and cites real tokens in backticks, and the recipe uses each role its cited
  component tokens name.

A class list the rules cannot read (built at runtime from non-literal parts)
is checked only where it is literal; the rules never guess.

## Stories

Every component that renders something of its own has a story; a wrapper
that only composes other components, or a context provider, does not need
one. The story title follows the folder: `UI / Button`,
`Chat / ChatComposer`, `Chat / ChatExchange / QuestionBubble`,
`App / AppHeader`.

A primitive's stories are plain example components with no args: `Basic`
shows one instance, and `Variants`, `Sizes` and `Disabled` lay out every
combination in a table. The rows and columns of that table come from the
recipe's own `variants` object, so adding a variant to the recipe adds it to
the story without a second edit. `.storybook/playground-table.tsx` provides
the table.

Run `npm run storybook` while working on a component and
`npm run build-storybook` before opening a pull request.

## Adding a component

1. Find it in `DESIGN.md`. If it is not there, that document changes first.
2. Create the folder and the four files, named after the component.
3. Write the recipe from the component tokens, and name them in its comment.
4. Type the props on the element's props plus the recipe's variants.
5. Add the stories, with the variant table built from the recipe.
6. Export from `index.ts`, values and types by name.
