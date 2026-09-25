# Examples to read before building

The nearest existing shape, by what you are building. Read the recipe, the
component and the story of the example; copy the shape, not the content.

| Building | Read |
|---|---|
| A primitive with variants and sizes | `src/components/ui/Button/` (recipe with `compoundVariants`, `IconButton` as a variant wrapper, story with variant tables from `buttonRecipe.variants`) |
| A multi-part primitive | `src/components/ui/Select/` (`defineSlotRecipe`, Headless UI Listbox, `data-focus` shown only under keyboard modality, `namespace.ts` for `Select.Root` style access) |
| A table | `src/components/ui/Table/` (parts exported by full name and as a namespace) |
| A state line: no match, error, out of scope | `src/components/ui/StatusMessage/` (icon per status, `sr-only` label, `role="alert"` on error) |
| A tooltip or small hand-written behaviour | `src/components/ui/Tooltip/` (the one primitive Headless UI does not provide) |
| A loading or progress line with motion | `src/components/ui/ThoughtLine/` (theme.css animations, `elapsedTime.ts` pure logic beside it) |
| A product view over answer data | `src/components/Answer/AnswerCandidates.tsx` (typed `AnswerView` from `@/contracts`, show-all fold under `motion-safe:`, compact file card) |
| A one-off part used by one component | `src/components/ChatExchange/QuestionBubble.tsx` (lives in the parent's folder with its own story) |
| A resizable or measured panel | `src/hooks/useResizablePanel/` (`panelWidth.ts` pure logic with tests, the hook binds it) |
| Following a growing element, keyboard vs pointer, reduced motion | `src/hooks/useFollowScroll/`, `src/hooks/useInteractionModality/`, `src/hooks/usePrefersReducedMotion/` |
| A product story with mock data | `src/components/Answer/AnswerProfile.stories.tsx` (`ANSWERS` from `src/mocks/answers`, `storySourceHref` from `src/mocks/story`) |

Shared helpers in `src/components/ui/recipe.ts`: `defineRecipe`,
`defineSlotRecipe`, `cx`, `focusVisibleRing`, `capHeightBox`.

The rules that will check the result: `scripts/design-lint/rules/` (one file
per rule, the reason on top of each).
