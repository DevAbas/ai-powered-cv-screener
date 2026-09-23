# PLAN: AI-Powered CV Screener

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.2                                      |
| Date    | 2026-09-23                               |
| Status  | Active                                   |
| Owner   | Engineering                              |
| Goal    | Deliver the v1 pilot defined in PRD 1.3  |

This document records the technical decisions behind `docs/PRD.md`
(v1.3): stack, architecture, data schemas, model routing, design system,
pipelines, build order and evaluation. Product requirements live in the
PRD; engineering conventions live in `CLAUDE.md`. If the code and this
document disagree, change this document first, then the code.

This plan is not extended with new features. A new feature gets its own
plan in `docs/plans/<feature>.md`. This document changes only to correct
or refine the v1 build it describes.

---

## 1. Stack

- Next.js 16.3 (App Router, Turbopack, `src/` directory), React 19,
  TypeScript strict, Tailwind CSS 4, ESLint.
- Node 22 LTS (>= 22.13). Enforced by `.nvmrc` and `package.json`
  `engines`; required by the AI SDK, `pdfjs-dist` 6 and `unpdf`.
- Zod 4 for every schema. One schema is shared by the generator, the
  extractor, the API and the UI.
- Vercel AI SDK 7 (`ai`) with `@openrouter/ai-sdk-provider` and
  `@ai-sdk/google`.
- UI: Tailwind CSS 4 with tokens exported from `DESIGN.md` (§9);
  interactive primitives from Headless UI (`@headlessui/react`), styled
  through its `data-*` state attributes; `lucide-react` icons. Google Sans
  self-hosted through `next/font/local`. Provider logos are static SVGs in
  `public/icons/providers/`, referenced from the model registry.
- PDF: `@react-pdf/renderer` (generate), `unpdf` (extract text per page),
  `react-pdf` (render in the browser).
- Scripts run with `tsx` and load `.env.local` through `@next/env`.
- No database, no vector store, no auth (PRD §12). All state is files in
  the repository; conversation state lives in the browser for the session.

## 2. Environment and keys

- `OPENROUTER_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`
  (git-ignored). `.env.example` lists them with empty values.
- Cost ceiling is zero: every registry entry used by default is on a free
  tier. Paid entries are labelled as such and never the default.
- Every script is resumable: skip-if-exists per artefact, exponential
  backoff on 429/5xx, `--force` to regenerate.

## 3. Repository layout

```
DESIGN.md                            design system: source of truth for tokens (committed)
docs/PRD.md, docs/PLAN.md            product and technical documents
docs/COMPONENTS.md                   product component inventory with states
docs/plans/<feature>.md              plans for anything beyond v1
src/styles/tokens.generated.css      exported from DESIGN.md (design:export); never hand-edited
src/styles/theme.css                 hand-written: .dark colour roles, spacing, breakpoints, shadows, easings
src/app/globals.css                  layer order, Tailwind entry points, token imports, dark variant
src/contracts/                       candidate.ts, answer.ts, ask.ts (zod)
src/lib/ai/                          registry.ts, providers.ts, retry.ts
src/lib/pool/                        load.ts, normalize.ts, search.ts, embeddings.ts
src/lib/ask/                         tools.ts, retrieve.ts, compose.ts, validate.ts, stream.ts
src/mocks/                           fixtures: every answer kind, one malformed, one empty, progress, error
src/app/api/ask/route.ts             POST /api/ask (NDJSON stream)
src/app/page.tsx                     two-panel screen
src/app/dev/components/page.tsx      component preview: every component in every state against mocks
src/components/                      Screener, conversation/*, pool/*, ModelSelector
public/icons/providers/<provider>.svg provider logos
public/fonts/                        Google Sans files
scripts/                             check-theme.ts, check-models.ts, generate-cvs.ts, index-cvs.ts, eval.ts
public/cvs/<id>.pdf                  the pool (committed)
data/seeds/<id>.json                 generator ground truth (eval only; never read by the app)
data/photos/<id>.png                 generated headshots (committed)
data/index/<id>.json                 extracted page text + profile per CV (committed)
data/embeddings.json                 page-level embedding index (committed)
eval/golden.json                     golden questions
```

Rule: the app imports from `data/index` and `data/embeddings.json` only.
`data/seeds` is ground truth for tests and eval (PRD §4.1, §10.1).

## 4. Data model

### 4.1 CandidateProfile (`src/contracts/candidate.ts`)

Captures PRD §6. Produced by the generator (as part of a seed) and by the
extractor (from PDF text) with the same schema.

- `name`, `headline` (role + seniority), `location`, `remote` (onsite /
  hybrid / remote / relocation), `workAuthorization`, `availability`
  (notice period in days or "immediate")
- `yearsTotal`
- `skills[]`: `{ name, years? }`
- `languages[]`: `{ language, level }` (CEFR or native)
- `education[]`: `{ degree, field, institution, year }`
- `employment[]`: `{ company, title, industry, from, to | null }`
- `leadership` (boolean + short note), `certifications[]`

Derived at index time: `jobStability` (median tenure from `employment`).

### 4.2 CandidateSeed (generator only)

`CandidateProfile` + `contact` (`example.com` email, `+1-555` phone),
`photoPrompt`, `template` (one of three PDF layouts). Saved to
`data/seeds/<id>.json`; `id` is the slug of the name and must be unique.

### 4.3 Index entry (`data/index/<id>.json`)

`{ id, file, pages, text: string[] (one per page), profile: CandidateProfile }`

### 4.4 Embedding index (`data/embeddings.json`)

`{ model, dims, vectors: [{ id, page, v: number[] }] }` — one vector per
page. The API refuses to run if the query-time embedding model differs
from `model`.

### 4.5 Answer (`src/contracts/answer.ts`)

A flat envelope (Gemini structured output does not accept `z.union`),
validated per kind with `superRefine`:

```
kind: filter | rank | compare | fact | profile | count | empty | insufficient | out_of_scope
summary: string
candidates?: { candidateId, name, reason, page }[]     filter, rank (ordered), count
comparison?: { candidateIds: [a, b], rows: { criterion, a, b }[] }
fact?: { text, candidateId, page }
profile?: { candidateId, headline, sections: { title, items[] }[] }
count?: number                                          overwritten by the server
```

`empty`, `insufficient` and `out_of_scope` are distinct states (PRD §7.4)
and carry no candidates.

## 5. Model registry (`src/lib/ai/registry.ts`)

The backend talks to models only through the registry. The models the
recruiter can choose (PRD §10.5) are registry entries, not providers.

| id | Role | Provider | Tier | Notes |
|----|------|----------|------|-------|
| `fast` | Answer model, recommended and preselected | OpenRouter (`:free` model with tools + JSON); fallback Google `gemini-2.5-flash` | free | `displayName` = the model's public name |
| `thorough` | Answer model | Google `gemini-2.5-pro` free tier | free (low rate limit) | `displayName` = the model's public name |
| `extract` | Profile extraction in the indexer | same as `fast` | free | not shown in the UI |
| `embed` | Page embeddings | Google `gemini-embedding-001`, 256 dims; fallback OpenRouter embedding model | free | not shown in the UI |
| `image` | Candidate photos | Google `gemini-2.5-flash-image`; fallback OpenRouter image-capable model | free | not shown in the UI |

Each entry: `{ id, displayName, description, provider, model,
capabilities: { tools, structuredOutput, streaming, image, embedding },
tier, recommended?, fallback? }`.

The UI reads `displayName` and `provider` from the registry: the model
selector lists every answer-capable entry by `displayName` with the
provider's logo from `public/icons/providers/<provider>.svg`; the entry
with `recommended: true` is preselected. Exact model ids are pinned after
`scripts/check-models.ts` passes; free model ids change often and are not
taken from memory.

## 6. Generation pipeline (`scripts/generate-cvs.ts`)

~30 candidates: frontend 6, backend 6, data 4, DevOps 4, QA 4, product 3,
3 mixed. Three resumable steps, `--only seeds|photos|pdfs`, `--limit N`,
`--force`.

1. Seeds: one structured-output call per candidate producing a
   `CandidateSeed`; the prompt receives the names and companies already
   used, and the script rejects duplicate names.
2. Photos: `generateText` on the `image` entry with
   `responseModalities: ['TEXT', 'IMAGE']`; first image file is saved to
   `data/photos/<id>.png`. A failed photo is reported, never fatal.
3. PDFs: `@react-pdf/renderer` with three layout templates (section
   order, fonts, one or two columns) so formats differ (PRD §1); photo
   embedded. Output `public/cvs/<id>.pdf`.

## 7. Indexer (`scripts/index-cvs.ts`)

For each PDF: `unpdf` extracts text per page; one structured-output call
on the `extract` entry turns the full text into a `CandidateProfile`;
skills, languages and roles are normalised through the alias tables in
`normalize.ts`; the entry is written to `data/index/<id>.json`. Then
`embedMany` over every page text writes `data/embeddings.json`.
Skip-if-exists per CV.

## 8. Retrieval and answering (`POST /api/ask`)

Retrieval is required. The whole pool is never placed in a prompt; only
retrieved pages and matching profiles reach the answer call. Two tools
and one embedding lookup:

- `search_cvs(filters)` → `{ count, candidates[] }`. Deterministic code
  over the profile index. Filters: skills, minYearsTotal, minYearsSkill,
  roles, seniority, location, remote, languages (with minimum level),
  degree, field, availableWithinDays, certifications, leadership, text
  (substring), `withinIds` (scopes a follow-up to the previous answer).
  Its `count` is the exact count.
- `get_cv(candidateId)` → `{ profile, pages[] }` for compare, fact and
  profile questions.
- Page retrieval: the question is embedded with the `embed` entry and
  matched by cosine similarity against `data/embeddings.json`, top 8,
  scoped to the matched candidates when there are any.

Flow:

1. Validate body `{ question, model, history[] }` (`model` is a registry
   id; schema in `src/contracts/ask.ts`).
2. Retrieve: `generateText` with the two tools (at most four steps). Each
   tool call is streamed as a progress stage ("Filtering 30 profiles… 7
   match", "Reading Lena Novak…"), then "Finding evidence pages…".
3. Compose: one `generateText` with `Output.object(AnswerSchema)`. The
   prompt holds only the retrieval result (compact profiles with ids,
   retrieved pages tagged `[id p.N]`), the last turns of history
   (`question, kind, summary, candidateIds`) and the question. System
   rules: CVs only, never invent, the kinds, "of those" means the previous
   answer's ids.
4. Validate against the retrieval result: candidate ids must be among
   the matched or fetched candidates (others dropped; an emptied filter or
   rank becomes `empty`); `count` is overwritten with the `search_cvs`
   count; every `page` must be a retrieved page of that candidate (else
   the candidate's best-scoring page); an unknown id in compare, fact or
   profile becomes `insufficient`.
5. Stream `{ type: 'answer', answer }` or `{ type: 'error', message,
   retryable }`.

Response is NDJSON: `progress` lines, then exactly one `answer` or
`error`. The client reads it with `fetch` and a `ReadableStream`. Two
model calls and one embedding per question; the ~10 s target (PRD §11)
depends on the recommended model's latency only.

## 9. Design system

The UI is built on a design system that exists before any product
component is written. `DESIGN.md` at the repository root (committed) is
the source of truth for tokens; generated files derive from it and are
never edited by hand.

Deliverables:

- `DESIGN.md` — tokens and rules in the design.md format. Lint script
  `design:lint` = `npx -y @google/design.md lint DESIGN.md && tsx
  scripts/check-theme.ts`.
- `src/styles/tokens.generated.css` — produced by `design:export` =
  `npx -y @google/design.md export --format css-tailwind DESIGN.md >
  src/styles/tokens.generated.css`. Committed, never hand-edited: change
  `DESIGN.md` and re-export.
- `src/styles/theme.css` — hand-written: `.dark` overrides for the colour
  roles (values provided at implementation), `--spacing` from
  `spacing.base`, and the breakpoints, shadows and easings that
  `DESIGN.md` describes only in prose. Changes in the same commit as
  `DESIGN.md`.
- `scripts/check-theme.ts` — run by `design:lint`. (1) The set of colour
  roles under `colors` in `DESIGN.md` must equal the set of `--color-*`
  overrides in the `.dark` block of `theme.css`. (2) It lints a copy of
  `DESIGN.md` with the colour values replaced by the dark values, through
  the `@google/design.md` linter API, so component contrast is checked in
  both themes. Fails on any mismatch or any warning.
- `src/app/globals.css` — no `@import "tailwindcss"`. Declares
  `@layer theme, base, components, utilities;`, then imports
  `tailwindcss/preflight.css` into `base`, `tailwindcss/utilities.css`
  into `utilities`, `tokens.generated.css` into `theme`, then `theme.css`;
  `@custom-variant dark (&:where(.dark, .dark *))`; `color-scheme` set per
  theme.
- Interactive primitives from `@headlessui/react`, styled through its
  `data-*` state attributes. Icons from `lucide-react`.
- Google Sans self-hosted via `next/font/local` from `public/fonts/`.
- `docs/COMPONENTS.md` — product component inventory with every state.
- `src/mocks/` — fixtures for every answer kind, one malformed answer, one
  empty answer, progress sequences and errors. The UI phase runs entirely
  against these.
- `/dev/components` (`src/app/dev/components/page.tsx`) — every component
  in every state from the mocks, in both themes.

Done when `design:lint` reports 0 errors and 0 warnings, re-running
`design:export` produces no diff, and all components render in all states
in both themes.

Before implementing: verify the Tailwind 4 entry points
(`tailwindcss/preflight.css`, `tailwindcss/utilities.css`, `@layer`
order, `@custom-variant`) against the installed version's documentation,
and record here whether the typography export includes line-height; if it
does not, line-heights are defined in `theme.css`.

## 10. User interface

Two panels on desktop, stacked on small screens (PRD §9). Interactive
primitives come from Headless UI, styled through its `data-*` state
attributes; icons from `lucide-react`.

- Header: product name, pool size.
- Left, conversation: empty state with pool size and six suggested
  questions (one per core use case); message list; `AnswerCard` renders
  one layout per `kind`; progress stages while waiting; error state with
  retry; copy-as-text on each answer; the composer.
- Composer: the question input and the `ModelSelector` — a list of
  answer-capable registry entries by `displayName` with the provider
  logo; the recommended entry is preselected (PRD §10.5).
- Source chip: candidate name only; click opens the CV at the cited page
  and marks the candidate as viewed.
- Right, pool: CV list (name, headline, viewed marker) by default; the
  selected CV rendered with `react-pdf` (`ssr: false`, worker configured
  in the same module) and scrolled to the cited page; a back control on
  small screens.
- State: one reducer in `Screener` — messages, selected model, selected
  CV and page, viewed ids. Session-only, no persistence (PRD §12).
- Data source: the screen talks to one `ask` client module. During the
  UI phase it is backed by `src/mocks`; the API phase swaps it for
  `POST /api/ask` without touching components.

## 11. Evaluation (`scripts/eval.ts`, built last)

`eval/golden.json` holds 15–20 questions covering every PRD §5 use case.
Expectations are rules evaluated against `data/seeds` at run time (for
example `{ skill: "Python" }` → the expected id set), so they survive
regeneration. The script runs each question through the ask pipeline and
scores: correctness (set or order match; count equals truth), sourcing
(every id exists; every page was retrieved) and invented facts (no unknown
ids; no candidates for `empty` or `out_of_scope`). It prints a table and
exits non-zero on any failure.

## 12. Build order

Prerequisites: Node 22 (`nvm use`), dependencies installed,
`.env.example` in place; keys only from the phase that first needs them.

1. **Contracts** — zod schemas (`candidate.ts`, `answer.ts`, `ask.ts`),
   the model registry with `displayName`, `provider` and `recommended`,
   providers, retry, `normalize.ts`, `scripts/check-models.ts`. Done when
   types compile, `normalize` unit tests pass and `check-models` passes
   for every entry (needs keys).
2. **Design system** — §9. Done when `design:lint` reports 0 errors and
   0 warnings, re-running `design:export` produces no diff, and all
   components render in all states in both themes on `/dev/components`.
3. **UI against mocks** — §10, driven only by `src/mocks`, including the
   malformed and empty fixtures, progress and error sequences. Done when
   every PRD §8 step works with mock data, on desktop and stacked layouts.
4. **Generation** — §6. Done when 30 unique seeds, photos and PDFs are
   committed and a re-run is a no-op.
5. **Indexer** — §7. Done when `data/index` and `data/embeddings.json`
   are committed and three profiles are spot-checked against their PDFs.
6. **API (swap mocks)** — §8; the `ask` client module switches from mocks
   to `POST /api/ask`. Done when every PRD §5 use case returns the right
   `kind` end to end and progress stages mirror the tool calls.
7. **Eval** — §11. Done when all golden questions pass.

Each phase ends with `lint`, `tsc`, `build` and `test` clean, and a
commit.

## 13. Runbook

```
nvm use                     # Node 22 from .nvmrc
npm install
cp .env.example .env.local  # add keys
npm run design:lint         # DESIGN.md: 0 errors, 0 warnings
npm run design:export       # regenerate tokens.generated.css (no diff expected)
npm run check-models        # verify every registry entry
npm run generate            # seeds → photos → PDFs (resumable)
npm run index               # profiles + embeddings
npm run dev                 # http://localhost:3000  (/dev/components for the preview)
npm run eval                # golden questions
```

The committed pool, index and embeddings mean `npm run dev` works from a
fresh clone without keys for browsing CVs; asking questions needs keys.

## 14. Plan complete when

- All seven phases in §12 are done and each phase's "done when" holds.
- PRD §11 is verified: a filter question returns a correct, sourced list
  in under ~10 s on the recommended model; every answer is traceable to a
  CV in one click; empty-result and out-of-scope questions never produce
  an invented candidate or fact; a first-time recruiter asks a useful
  question within 30 s, guided by the empty state.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` and
  `npm run eval` are clean on a fresh clone under Node 22.
- Pool, index and embeddings are committed; `.env.example` documents
  every key; the runbook in §13 works as written.
- Anything left over is not added here; it becomes its own plan in
  `docs/plans/<feature>.md`.

## 15. Changelog

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2026-09-22 | Initial version. |
| 1.1     | 2026-09-23 | Header: goal, status Active, no-new-features rule. Stack: shadcn/ui + lucide-react, Google Sans, provider logos. Registry exposes displayName/provider; recommended preselected. New §9 Design system, §12 Build order (contracts → design system → UI against mocks → generation → indexer → API → eval), §14 Plan complete when. |
| 1.2     | 2026-09-23 | §9 Design system rebuilt on design.md: DESIGN.md as token source, `design:lint` (design.md lint + `scripts/check-theme.ts`: role-set parity and dark-theme contrast) / `design:export`, `tokens.generated.css` + `theme.css`, Tailwind layer order in `globals.css`, Headless UI instead of shadcn/ui. Stack, layout, UI, build order and runbook updated to match. |
