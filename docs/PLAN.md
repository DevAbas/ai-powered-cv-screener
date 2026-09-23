# PLAN: AI-Powered CV Screener

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.5                                      |
| Date    | 2026-09-23                               |
| Status  | Active                                   |
| Owner   | Engineering                              |
| Goal    | Deliver the v1 pilot defined in PRD 1.3  |

This document records how and when the pilot in `docs/PRD.md` (v1.3) is
built: technical decisions and their reasons, phases, done criteria and
open questions. Product requirements live in the PRD; engineering
conventions live in `AGENTS.md`; visual rules live in `DESIGN.md`; exact
values live in the code. If the code and this document disagree, change
this document first, then the code.

This plan is not extended with new features. A new feature gets its own
plan in `docs/plans/<feature>.md`. This document changes only to correct
or refine the v1 build it describes.

---

## Stack

- Next.js 16.3 (App Router, Turbopack), React 19, TypeScript, Tailwind
  CSS 4, ESLint.
- Node 22 LTS (>= 22.13), pinned by `.nvmrc` and `package.json` `engines`.
- `zod` 4.
- `ai` 7, `@openrouter/ai-sdk-provider`, `@ai-sdk/google`.
- `@headlessui/react`, `lucide-react`; UI details live in `DESIGN.md`.
- `@react-pdf/renderer`, `unpdf`, `react-pdf`.
- `tsx`, `@next/env`, Vitest.
- No database, no vector store, no auth (PRD, Non-goals). All state is
  files in the repository; conversation state lives in the browser for
  the session.

## Environment

- Cost ceiling is zero: every registry entry used by default is on a free
  tier. Paid entries are labelled as such and never the default.
- Every script is resumable: skip-if-exists per artefact, exponential
  backoff on 429/5xx, `--force` to regenerate.
- API key names live in `.env.example`; values go in `.env.local`, which
  is git-ignored.

## Data access

The app reads only `data/index` and `data/embeddings.json`. `data/seeds`
is generator ground truth for tests and eval and is never read by the app
(PRD, Pilot data; PRD, Functional requirements: Answers).

## Data model

The schemas live in `src/contracts/` and are the single source of truth;
every LLM output is validated against them. The reasons behind their
shape:

- No field an LLM produces uses a union: Gemini structured output does
  not accept `z.union`. Values that would be unions are encoded without
  one (for example availability as days, `0` meaning immediate).
- The answer is a flat envelope with a `kind` and optional payload
  fields, validated per kind in code, for the same reason.
- The per-kind rules are also written into the schema's field
  descriptions and exported as prompt text, because the per-kind
  validation is not part of the JSON Schema the model sees.
- `empty`, `insufficient` and `out_of_scope` are distinct kinds with no
  candidates (PRD, UX principles: Uncertainty is visible).
- Derived values such as median tenure are computed at index time, not
  extracted by the model.

## Model registry

The backend talks to models only through the registry
(`src/lib/ai/registry.ts`), which holds the model ids and the entry
shape. Model ids are pinned only after `check-models` passes; free model
ids change often and are never taken from memory.

### Answer models

- The recruiter chooses between registry entries, not providers (PRD,
  Model selection). Answer entries are named slots, `primary` and
  `alternative`; no display name or description claims one answers better
  than the other.
- Each entry names its routing `provider` (used only to build the SDK
  model) and its `vendor`, the model maker. UI logos are keyed by
  `vendor`.
- Gemini 2.5 is closed to new API keys and no Pro model has a free tier
  (checked 2026-09-23), so answer entries use free Flash-class or
  OpenRouter `:free` models.
- `recommended` is provisional on `primary` until the eval sets it
  (Evaluation).

### Acceptance criteria

An answer model enters the registry only if it meets all four:

1. **Capabilities.** `check-models` passes for tools, structured output
   and streaming.
2. **Correctness.** On the golden questions it meets every threshold in
   Evaluation.
3. **Latency.** P95 end-to-end latency per question is at most ~10 s
   (PRD, Success criteria).
4. **Free-tier budget.** A working day of use (indexing, eval and a
   recruiter session) fits the provider's free-tier daily limit.

Until the eval exists, only criterion 1 can be applied, so the answer
entries are provisional.

### Reliability

Answer and extract calls go through `runStructured`
(`src/lib/ai/structured.ts`):

- **Streamed internally.** Calls use `streamText` with `Output.object`;
  the caller receives the complete object once.
- **First-output timer.** Our own timer starts with each model call and
  stops at the first content-bearing chunk (text, object, reasoning or
  tool input; not stream metadata). The SDK's `firstChunkMs` is not used:
  it starts only after the response headers arrive, so it misses a model
  that never answers the request.
- **Total budget.** One `totalMs` covers primary, repair and fallback
  together.
- **Caller abort.** The caller's signal (the UI Stop button) is combined
  with both timers; an abort ends the call without fallback.
- **Failure rules.** 5xx and 429 include errors inside an HTTP 200 body
  and mid-stream.
  - Timeout: no retry, straight to the entry's fallback.
  - 5xx (it arrived before the first-output limit): one retry on the same
    model after at most 1 s of random jitter, then the fallback.
  - 429 daily quota (OpenRouter `free-models-per-day`): no retry, the
    fallback, and the entry's breaker opens at once.
  - Any other 429 or an unavailable model: no retry, the fallback.
  - Backoff on the same model is for scripts only.
- **Schema repair.** A response that fails its schema gets one repair
  call with its own text and the zod issues; if that also fails, the
  fallback answers. Timeouts are never repaired.
- **Circuit breaker.** In memory, per entry: after 2 timeouts or 5xx
  within 5 minutes (a 5xx and its failed retry count as two) the primary
  is skipped for a 3-minute cooldown; after the cooldown it is tried
  again, and one more failure reopens the breaker. A daily quota error
  opens it at once.
- The timer values in code are placeholders until set from the measured
  P95 time to first token (Open questions). `check-models` records time
  to first token per call.

### Embeddings

A question is embedded only with the model recorded in
`data/embeddings.json`; on a mismatch or a failed call the API raises an
error. There is no fallback at query time. The `embed` entry carries a
rebuild-only fallback, used only to rebuild the whole index.

### Free-tier limits

- OpenRouter `:free` models: 20 requests/min; 1,000 requests/day once
  the account has bought at least $10 of credits, 50/day without.
- Gemini API: free-tier limits are shown only in AI Studio, not in the
  docs; preview models get tighter limits.
- Each question costs two model calls and one embedding (Retrieval and
  answering).

## Generation pipeline (`scripts/generate-cvs.ts`)

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
   order, fonts, one or two columns) so formats differ (PRD, Problem);
   photo embedded. Output `public/cvs/<id>.pdf`.

## Indexer (`scripts/index-cvs.ts`)

For each PDF: `unpdf` extracts text per page; one structured-output call
on the `extract` entry turns the full text into a `CandidateProfile`;
skills, languages and roles are normalised through the alias tables in
`normalize.ts`; the entry is written to `data/index/<id>.json`. Then
`embedMany` over every page text writes `data/embeddings.json`.
Skip-if-exists per CV.

## Retrieval and answering (`POST /api/ask`)

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
3. Compose: one structured-output call with `AnswerSchema` through
   `runStructured` (Model registry, Reliability). The prompt holds only
   the retrieval result (compact profiles with ids, retrieved pages
   tagged `[id p.N]`), the last turns of history (`question, kind,
   summary, candidateIds`) and the question. System rules: CVs only,
   never invent, the kinds and their payload rules (`ANSWER_KIND_RULES` in
   `src/contracts/answer.ts`), "of those" means the previous answer's
   ids.
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
model calls and one embedding per question; the ~10 s target (PRD,
Success criteria) depends on the recommended model's latency only.

## Design system

Token and theme rules live in `DESIGN.md` and `AGENTS.md`. Deliverables:

- `DESIGN.md`, checked by `design:lint` (the `@google/design.md` linter
  plus `scripts/check-theme.ts`, which requires the dark theme to cover
  every colour role and lints contrast in both themes).
- `src/styles/tokens.generated.css`, produced from `DESIGN.md` by
  `design:export`; never edited by hand.
- `src/styles/theme.css`: dark colour roles and the values `DESIGN.md`
  describes only in prose.
- `src/app/globals.css`: explicit `@layer` order with Tailwind's
  preflight and utilities imported separately (no `@import
  "tailwindcss"`), then the token and theme files, and a class-based dark
  variant.
- `docs/COMPONENTS.md`: product components and their states.
- `src/mocks/`: fixtures for every answer kind, one malformed answer, one
  empty answer, progress sequences and errors, a slow path (~6 s: the
  answer arrives after a schema repair) and a very slow path (~30 s: the
  answer arrives from the fallback model). The UI phase runs entirely
  against these.
- `/dev/components`: every component in every state from the mocks, in
  both themes.

Before implementing, verify the Tailwind 4 entry points against the
installed version's documentation and record whether the typography
export includes line-height.

Done when `design:lint` reports 0 errors and 0 warnings, re-running
`design:export` produces no diff, and all components render in all states
in both themes.

## User interface

Layout and behaviour live in the PRD (Information architecture, Core
flow), visual rules in `DESIGN.md`, components and their states in
`docs/COMPONENTS.md`. Architecture:

- State: one reducer in `Screener`, session-only, no persistence (PRD,
  Non-goals).
- Data source: the screen talks to one `ask` client module. During the
  UI phase it is backed by `src/mocks`; the API phase swaps it for
  `POST /api/ask` without touching components.
- CV preview: `react-pdf` loaded with `ssr: false`, its worker configured
  in the same module.
- Stop: a Stop button aborts the request; the abort signal reaches
  `runStructured` on the server, which ends without fallback.
- Progress: the stages mirror the tool calls. After ~10 s without an
  answer, a neutral "Taking longer than usual…" line is added. Schema
  repair and model fallback are never shown as separate stages.

## Evaluation (`scripts/eval.ts`, built last)

`eval/golden.json` holds 15–20 questions covering every PRD use case (PRD,
Use cases). Expectations are rules evaluated against `data/seeds` at run
time (for example `{ skill: "Python" }` → the expected id set), so they
survive regeneration.

The script runs per answer model: `--model primary|alternative`, or both
when omitted. Each question goes through the ask pipeline and is scored
in two stages:

- Retrieval (tool calls and page retrieval, before compose): did
  `search_cvs` / `get_cv` return the expected ids, and were the evidence
  pages retrieved.
- Composition (the final answer): correctness (set or order match; count
  equals truth), sourcing (every id exists; every page was retrieved) and
  invented facts (no unknown ids; no candidates for `empty` or
  `out_of_scope`).

It records end-to-end latency per question and prints a side-by-side
table per model: correctness, invented facts and P95 latency, with
retrieval and composition shown separately. It exits non-zero when a
model fails the acceptance criteria (Model registry). The eval result
sets `recommended` in the registry: the entry that passes all criteria
with the best correctness, lower P95 latency breaking a tie.

Thresholds, per model over all golden questions:

| Metric | Threshold |
|--------|-----------|
| Invented candidates | 0 (hard fail: one is enough) |
| Sourcing | 100% |
| Correctness | ≥ 90% |

A model that fails any threshold leaves the registry.

## Build order

Prerequisites: Node 22 (`nvm use`), dependencies installed,
`.env.example` in place; keys only from the phase that first needs them.

1. **Contracts** — zod schemas (`candidate.ts`, `answer.ts`, `ask.ts`),
   the model registry with `displayName`, `provider` and `recommended`,
   providers, retry, `normalize.ts`, `scripts/check-models.ts`. Done when
   types compile, `normalize` unit tests pass and `check-models` passes
   for every entry (needs keys).
2. **Design system** — Design system. Done when `design:lint` reports 0
   errors and 0 warnings, re-running `design:export` produces no diff, and
   all components render in all states in both themes on
   `/dev/components`.
3. **UI against mocks** — User interface, driven only by `src/mocks`,
   including the malformed and empty fixtures, progress and error
   sequences. Done when every step of the PRD core flow (PRD, Core flow)
   works with mock data, on desktop and stacked layouts.
4. **Generation** — Generation pipeline. Done when 30 unique seeds,
   photos and PDFs are committed and a re-run is a no-op.
5. **Indexer** — Indexer. Done when `data/index` and
   `data/embeddings.json` are committed and three profiles are
   spot-checked against their PDFs.
6. **API (swap mocks)** — Retrieval and answering; the `ask` client
   module switches from mocks to `POST /api/ask`. Done when every PRD use
   case returns the right `kind` end to end and progress stages mirror the
   tool calls.
7. **Eval** — Evaluation. Done when all golden questions pass.

Each phase ends with `lint`, `tsc`, `build` and `test` clean, and a
commit.

## Plan complete when

- All seven phases in Build order are done and each phase's "done when"
  holds.
- PRD, Success criteria is verified: a filter question returns a correct,
  sourced list in under ~10 s on the recommended model; every answer is
  traceable to a CV in one click; empty-result and out-of-scope questions
  never produce an invented candidate or fact; a first-time recruiter
  asks a useful question within 30 s, guided by the empty state.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` and
  `npm run eval` are clean on a fresh clone under Node 22.
- Pool, index and embeddings are committed; `.env.example` documents
  every key; the commands in `AGENTS.md` work as written.
- Anything left over is not added here; it becomes its own plan in
  `docs/plans/<feature>.md`.

## Open questions

| # | Question | Blocks |
|---|----------|--------|
| 1 | `image` model. No free image model is available: every Gemini image model has no free tier (pricing page "Not available"; a probe of `gemini-3.1-flash-lite-image` returned `free_tier_requests, limit: 0` on 2026-09-23), `gemini-2.5-flash-image` shuts down 2026-10-02, and OpenRouter has no `:free` image model. Candidate: `google/gemini-3.1-flash-lite-image` via OpenRouter (paid, ~$0.034 per 1K image, ~$1 for 30 photos). Needs a decision to use a paid entry for generation, which Environment allows only when labelled paid and never used by default. The `image` entry stays out of the registry until this is decided. | Generation |
| 2 | Answer acceptance run pending quota: the `primary` answer check with `--repeat 20` must end with 0 final failures after repair. 7/7 clean first attempts so far; the run stopped on OpenRouter's 50 requests/day limit (0 credits on the account). If it does not reach 0, the answer schema moves to required-nullable payload fields. | API |
| 3 | `alternative` (`gemini-3.6-flash`) fails the latency criterion (5–44 s per call, one 90 s timeout). Decide its replacement before the API phase. | API |
| 4 | Set the first-output and total limits from the measured P95 time to first token (`check-models`); the values in code are placeholders. | API |
| 5 | Evaluate `liquid/lfm-2.5-2.6b:free` as a fast middle tier between the primary and Gemini (tools 1.6 s, streaming 0.6 s; one schema failure before the kind rules and repair existed). | Eval |

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2026-09-22 | Initial version. |
| 1.1     | 2026-09-23 | Header: goal, status Active, no-new-features rule. Stack: shadcn/ui + lucide-react, Google Sans, provider logos. Registry exposes displayName/provider; recommended preselected. New §9 Design system, §12 Build order (contracts → design system → UI against mocks → generation → indexer → API → eval), §14 Plan complete when. |
| 1.2     | 2026-09-23 | §9 Design system rebuilt on design.md: DESIGN.md as token source, `design:lint` (design.md lint + `scripts/check-theme.ts`: role-set parity and dark-theme contrast) / `design:export`, `tokens.generated.css` + `theme.css`, Tailwind layer order in `globals.css`, Headless UI instead of shadcn/ui. Stack, layout, UI, build order and runbook updated to match. |
| 1.3     | 2026-09-23 | §5: registry entries gain `vendor` (model maker; UI logos keyed by it, `provider` is routing only); `embed` has a rebuild-only fallback, no fallback at query time. §1: Vitest for unit tests. §4.1: CandidateProfile gains `role` and `seniority` enums; `remote` is a list; `availability` is days (0 = immediate); `degree` is an enum. §4.3: `medianTenureMonths`. `image` fallback moved to the new §15 Open questions, blocking phase 4; Changelog is now §16. |
| 1.4     | 2026-09-23 | §5: answer ids renamed `fast`/`thorough` → `primary`/`alternative` (slots, no quality claim). `primary` = `nvidia/nemotron-3-super-120b-a12b:free` with fallback `gemini-3.6-flash`; `alternative` = `gemini-3.6-flash` (`gemini-3.8-flash` swaps in once it passes); Gemini 2.5 is closed to new keys. `embed` → `gemini-embedding-2` (256 dims); rebuild-only fallback `nvidia/nemotron-3-embed-1b:free` at 2048 dims. New answer model acceptance criteria and free-tier limits; `recommended` provisional until the eval. §11: eval per model with a side-by-side table (correctness, invented facts, P95 latency), retrieval and composition scored separately; the result sets `recommended`; thresholds: invented candidates = 0 (hard fail), sourcing = 100%, correctness ≥ 90%, and a model that fails any leaves the registry. §8: per-kind payload rules in the compose prompt and schema descriptions; one schema repair call, then the fallback model. §10: neutral "Taking longer than usual…" after ~10 s; repair and fallback are never separate stages. §3/§9: mocks gain a slow (~6 s, repair) and a very slow (~30 s, fallback) path. §15: no free image model; paid candidate and cost recorded. |
| 1.5     | 2026-09-23 | Slimmed to decisions, phases, done criteria and open questions; other facts are referenced by document and heading instead of repeated, and headings are no longer numbered. Stack lists packages only. Repository layout replaced by the Data access rule. Data model keeps the reasons; field lists live in `src/contracts/`. Model registry keeps decisions, acceptance criteria, embedding rule and limits; model ids and entry shape live in `src/lib/ai/registry.ts`. New Reliability rules: answer and extract calls streamed internally with our own first-output timer, cleared by text, object, reasoning or tool input (the SDK's `firstChunkMs` misses a stall before response headers); one total budget for primary, repair and fallback; caller abort without fallback; failure rules: timeout → fallback without retry, 5xx → one retry after ≤ 1 s jitter then fallback, 429 daily quota → fallback without retry and the breaker opens at once; one schema repair; per-entry circuit breaker (2 timeouts or 5xx in 5 min → 3 min cooldown). Design system shortened to deliverables and done criteria. User interface keeps architecture only, adds the Stop button through the abort signal. Runbook removed (commands live in `AGENTS.md`). Retrieval and answering: compose goes through `runStructured`. Open questions 2–5: answer acceptance run pending quota, `alternative` latency, timer values from measured P95, `lfm-2.5-2.6b` as a middle tier. |
