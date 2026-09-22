# PLAN: AI-Powered CV Screener

| Field   | Value        |
|---------|--------------|
| Version | 1.0          |
| Date    | 2026-09-22   |
| Status  | Approved     |
| Owner   | Engineering  |

This document records the technical decisions behind `docs/PRD.md`
(v1.2): stack, architecture, data schemas, model routing, pipelines and
evaluation. Product requirements live in the PRD; engineering conventions
live in `CLAUDE.md`. If the code and this document disagree, change this
document first, then the code.

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
docs/PRD.md, docs/PLAN.md            product and technical documents
src/lib/schema/                      candidate.ts, answer.ts (zod)
src/lib/ai/                          registry.ts, providers.ts, retry.ts
src/lib/pool/                        load.ts, normalize.ts, search.ts, embeddings.ts
src/lib/ask/                         tools.ts, retrieve.ts, compose.ts, validate.ts, stream.ts
src/app/api/ask/route.ts             POST /api/ask (NDJSON stream)
src/app/page.tsx                     two-panel screen
src/components/                      Screener, conversation/*, pool/*, ModeSelector
scripts/                             check-models.ts, generate-cvs.ts, index-cvs.ts, eval.ts
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

### 4.1 CandidateProfile (`src/lib/schema/candidate.ts`)

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

### 4.5 Answer (`src/lib/schema/answer.ts`)

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

The backend talks to models only through the registry. The user-facing
answer modes (PRD §10.5) are registry entries, not providers.

| id | Role | Provider | Tier | Notes |
|----|------|----------|------|-------|
| `fast` | Answer mode, recommended default | OpenRouter (`:free` model with tools + JSON); fallback Google `gemini-2.5-flash` | free | UI label "Fast (recommended)" |
| `thorough` | Answer mode | Google `gemini-2.5-pro` free tier | free (low rate limit) | UI label "Thorough (slower)" |
| `extract` | Profile extraction in the indexer | same as `fast` | free | |
| `embed` | Page embeddings | Google `gemini-embedding-001`, 256 dims; fallback OpenRouter embedding model | free | |
| `image` | Candidate photos | Google `gemini-2.5-flash-image`; fallback OpenRouter image-capable model | free | |

Each entry: `{ id, label, description, provider, model, capabilities:
{ tools, structuredOutput, streaming, image, embedding }, tier,
recommended?, fallback? }`. Exact model ids are pinned after
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

1. Validate body `{ question, mode, history[] }`.
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
depends on the `fast` model's latency only.

## 9. User interface

Two panels on desktop, stacked on small screens (PRD §9).

- Header: product name, pool size, `ModeSelector` (labels and the
  recommended flag from the registry).
- Left, conversation: empty state with pool size and six suggested
  questions (one per core use case); message list; `AnswerCard` renders
  one layout per `kind`; progress stages while waiting; error state with
  retry; input; copy-as-text on each answer.
- Source chip: candidate name only; click opens the CV at the cited page
  and marks the candidate as viewed.
- Right, pool: CV list (name, headline, viewed marker) by default; the
  selected CV rendered with `react-pdf` (`ssr: false`, worker configured
  in the same module) and scrolled to the cited page; a back control on
  small screens.
- State: one reducer in `Screener` — messages, mode, selected CV and
  page, viewed ids. Session-only, no persistence (PRD §12).

## 10. Evaluation (`scripts/eval.ts`, built last)

`eval/golden.json` holds 15–20 questions covering every PRD §5 use case.
Expectations are rules evaluated against `data/seeds` at run time (for
example `{ skill: "Python" }` → the expected id set), so they survive
regeneration. The script runs each question through the ask pipeline and
scores: correctness (set or order match; count equals truth), sourcing
(every id exists; every page was retrieved) and invented facts (no unknown
ids; no candidates for `empty` or `out_of_scope`). It prints a table and
exits non-zero on any failure.

## 11. Runbook

```
nvm use                     # Node 22 from .nvmrc
npm install
cp .env.example .env.local  # add keys
npm run check-models        # verify every registry entry
npm run generate            # seeds → photos → PDFs (resumable)
npm run index               # profiles + embeddings
npm run dev                 # http://localhost:3000
npm run eval                # golden questions
```

The committed pool, index and embeddings mean `npm run dev` works from a
fresh clone without keys for browsing CVs; asking questions needs keys.

## 12. Changelog

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2026-09-22 | Initial version. |
