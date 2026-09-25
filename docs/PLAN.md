# PLAN: AI-Powered CV Screener

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.24                                     |
| Date    | 2026-09-25                               |
| Status  | Active                                   |
| Owner   | Engineering                              |
| Goal    | Deliver the v1 pilot defined in PRD 1.17 |

If the code and this document disagree, change this document first, then
the code. This plan is not extended with new features; a new feature gets
its own plan in `docs/plans/<feature>.md`.

---

## Environment

- This phase runs one model: Google Gemini 3.5 Flash-Lite on the Gemini
  API, pinned to its July 2026 release rather than the moving
  `gemini-flash-lite-latest` alias, with no fallback, so there is one
  behaviour to tune the mission for. Every answer, extraction and seed
  call uses it. The Gemini API free tier allows about 1,000 requests a
  day and 15 a minute per model (Gemini API rate limits); billed, a
  question costs a few tenths of a cent. The OpenRouter entries stay in
  the registry disabled for the next phase: pay-as-you-go, never the
  `openrouter/free` router (the `:free` endpoints were dropped on
  2026-09-25, when both pinned free models were unavailable at once). A
  run states its estimate and the remaining quota or credits before it
  starts. The paid `image` entry runs only when named.
- Every script is resumable (skips what already exists) and can be forced
  to regenerate.
- Every parameter starts from a documented value, cited next to it, and
  changes only when the evaluation shows the change helps.

## Data layout

Each folder of `data/` has one owner:

| Path | Holds | Read by |
|---|---|---|
| `data/generation/seeds/<id>.json` | The ground truth each CV was rendered from | Scripts and the evaluation |
| `data/generation/manifest.json` | The generator's state: whether each PDF carries a photo | The generator |
| `data/generation/photos/<id>.jpg` | Generated photos | The generator |
| `data/index/<id>.json` | One index entry per CV (`IndexEntrySchema`) | The app, once at startup |
| `data/cvs/<id>.pdf` | The CVs | The CV route |
| `data/eval/` | Evaluation reports | Nobody at run time |

App code never imports from `data/generation`; ESLint `no-restricted-imports`
enforces it.

## Data access

The app reads the index folder, the CVs and the chunk vectors in Pinecone.

- The index is loaded by one `server-only` module: every file is validated
  against the contract when loaded, once per process, and kept in memory.
- `GET /api/cvs/<id>` serves a CV: only ids present in the index, the path
  built from the index entry and never from the request, `application/pdf`
  with a `Content-Disposition` naming `<name>_<surname>_cv.pdf`. Access
  control would go here; v1 has none (PRD, Non-goals).

## Vector store

Pinecone is a fixed decision: one index (named in `.env.local`,
`PINECONE_INDEX`) on AWS us-east-1
(serverless, free Starter plan), dense, 768 dimensions, cosine, namespace
`cvs`, one record per section chunk with metadata (candidate id, section,
page, role, seniority, skills, languages). Putting every CV in every prompt
was considered and rejected. Vectors are rebuilt from the index
(`npm run index -- --step vectors --force`).

## Model registry

The backend talks to models only through the registry. Model ids come
from the provider's model list, never from memory.

### Answer models

- The recruiter chooses between the entries that passed the evaluation
  (PRD, Model selection). In this phase `primary` is Gemini 3.5
  Flash-Lite, `recommended`, offered provisionally until its evaluation
  run (Acceptance criteria), with no fallback, and the composer shows no
  menu; `alternative` (Nemotron 3 Super on OpenRouter, with Qwen3.8 27B
  as its fallback) is disabled until the evaluation admits it. No name or
  description claims one answers better than another.
- Candidates for the evaluation: Gemini 3.5 Flash-Lite now; when the
  alternative slot returns, `nvidia/nemotron-3-super-120b-a12b`,
  `qwen/qwen3.8-27b`, `google/gemma-4-31b-it` and
  `nvidia/nemotron-3-ultra-550b-a55b`.
- Gemini 3.6 Flash stays in the registry disabled: not in the menu, never
  a fallback, not evaluated in this phase.
- `extract` and `generate` use the primary's model with structured
  outputs; `embed` is `gemini-embedding-001` at 768 dimensions with the
  `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY` task types (provider docs).
- Model parameters follow each vendor's documentation and live in the
  registry; Gemini 3 keeps its default temperature (Google, Gemini 3
  developer guide).

### Acceptance criteria

An answer model is offered only if it meets all four:

1. **Capabilities.** Verified by the evaluation: tool calls with the pool
   vocabularies, the presentation call, streamed text.
2. **Correctness.** Every threshold in Evaluation.
3. **Latency.** P95 per question type is reported, not a gate (PRD, Success
   criteria).
4. **Cost.** A recruiter's day fits the Gemini API free tier (about
   1,000 requests: at most 3 model steps per question, plus the repair,
   presentation and rewrite calls a failed step can add), or a few tenths
   of a cent per question billed.

### Reliability

- Timeouts are the AI SDK's `timeout` (total, per step, first chunk, per
  tool), set from the evaluation's measured P95 times two; until measured,
  generous values documented in code.
- Before the first word of the final step, a 5xx gets one retry on the
  same model; a timeout, an empty answer, an unavailable model or an
  exhausted account (402) hands over to the fallback, when the entry has
  one (none in this phase: the error is shown, with Retry). Once text has reached the
  recruiter a failure ends the answer with an error, since two models'
  text would mix. When the fallback answers, the answer says so.
- A circuit breaker per model: two failures within five minutes open it
  for three minutes; a spent free allowance or an exhausted account opens
  it at once. The breaker only chooses between an entry and its fallback:
  an entry without one is always tried.
- Tool schemas reach the model without length, range or pattern keywords,
  which some free providers' grammar compilers reject (the one serving
  Qwen on OpenRouter refuses `minLength`); the contracts still validate
  every call, so nothing those keywords enforced is lost.
- Tool calls: an input that fails its schema is repaired by re-asking the
  model once (`repairToolCall`); if that fails it goes back to the model
  as a tool error in the next step. Nothing is dropped silently. A request
  is bounded at three model steps and ends with a clear error past that.
  An answer that ended in text after a tool returned candidates is not
  finished: one more call, with `present` as the tool choice, asks for the
  presentation, so the answer carries its CVs and sources; if that call
  fails, the text stands and the log says so. The text of that failed
  step is not trusted: it is re-asked in a few sentences when the view
  needs words (a profile, a comparison) and dropped when the app opens the
  view (a list, a count); a profile or comparison the model presented
  without words is re-asked the same way, and a count's answer is the
  app's sentence alone, whatever the model wrote. The chat template's
  tool-call tags are stripped from every answer.
- Schema repair (one repair call after a failed schema) remains for
  extraction and seeds, the calls that still use structured output.

## Generation pipeline

~30 candidates: frontend 6, backend 6, data 4, DevOps 4, QA 4, product 3,
fullstack 1, mobile 1, security 1. The roster (id, name, headline, role,
seniority, location) is fixed in the generator, EU names in EU locations;
the mock pool mirrors it and a test keeps them equal. Three steps:

1. Seeds: one structured profile per candidate, written by the `generate`
   entry from the fixed fields into `data/generation/seeds`; the prose
   (summary, per-job description and highlights) restates the structured
   fields only, so eval rules stay exact.
2. Photos: one AI-generated photo per candidate from the `image` entry,
   which is paid, so the step runs only when named; a failed photo is
   reported, never fatal, and the CV simply has no photo. The pool is done
   with photos wherever the paid step was run.
3. PDFs: one single-column layout after the sample CV the pilot was given
   (photo, name, accent headline, contact line, uppercase section headings
   over hairlines), in three variants (font, date style) so formats differ
   (PRD, Problem) while every CV parses; the accent is the design system's
   `primary-text`; the photo is embedded when it exists. Files are
   `data/cvs/<id>.pdf`; the manifest records whether each has a photo.

## Indexer

For each PDF in `data/cvs`: the text per page (pdf.js, the library that
draws the preview, so a cited page is the page the recruiter sees), split
into sections at the CV's own headings: a line that equals one of the
contract's `SECTION_NAMES`, case aside, starts a section; the text before
the first heading is the header; a section that continues on the next page
gives one chunk per page. Then one profile extracted by the `extract`
entry from the section text, each field verified against the text of its
own section and recorded with its section and page (`sources`), the CV's
own spelling taken from the located text, and the median job tenure. One
file per CV, `data/index/<id>.json`, skipped when it exists unless forced.
The `sources` step rebuilds the chunks and sources of indexed CVs from the
PDF and the profile already indexed, without a model call, after a change
to the section rules or the verification.

`npm run index -- --check` compares every indexed profile with its seed,
field by field, and reports the accuracy per field and the share of
verified sources. Threshold: every field at least 98%, verified sources
at least 98%.

Then one vector per chunk into Pinecone, keyed `<id>:<section>:<page>`,
resumable by id prefix.

## Retrieval and answering

The model understands the question, chooses typed tools and writes the
answer from what they returned; the app runs the tools deterministically
over the in-memory index and draws the views from their results. Every
step is its own module behind an interface (`src/lib/screening` with its
`tools/`, `src/lib/search`, `src/lib/models`), composed in one place, so each
is tested alone.

1. **Tools.** `find_candidates(filters, scope)` returns the matching
   candidates with the evidence for each criterion (field, value, page,
   section); `count_candidates(filters, scope)` returns the count and the
   pool size; `get_candidates(ids)` returns full profiles with sources;
   `search_cv_text(query, filters, scope)` searches the chunks;
   `present(view, candidates, skills)` names the view or state, the
   candidates by id with the cited page and a reason each, and the skills
   whose years the list shows. `present` has no execute: it ends the loop.
   Counts come only from `count_candidates`; a ranking filters first, then
   the model orders the candidates with a reason each; listing all CVs is
   `find_candidates` with no filter.
2. **Vocabularies.** Tool arguments are enums built from the pool's own
   values: roles, seniorities, skills, languages, levels, cities,
   countries, institutions, degrees, fields, companies, industries,
   certifications, work modes, work authorizations and candidate ids. The
   model maps a question's wording to them ("UPC" to the institution's
   full name); a value outside the enum is rejected and repaired, never
   silently matched to nothing. The fields cover PRD, What the recruiter
   evaluates on.
3. **Filter semantics.** Ranges are `gte`, `gt`, `lte`, `lt`: "5+ years"
   is `gte: 5`, "under 2 years" is `lt: 2`, "at most 2" is `lte: 2`.
   Language levels are ordered A1 < A2 < B1 < B2 < C1 < C2 < native (CEFR,
   Council of Europe); "speaks German" means any level unless the question
   states one. Seniority is ordered junior < mid < senior < lead <
   principal. Skills match all listed ones unless `skillsMatch: any`.
   `scope` is the whole pool or the previous answer's candidates.
4. **Hybrid search.** The query is embedded and Pinecone returns the
   nearest chunks under a metadata filter (scope, and any role, skill or
   language filter); BM25 runs in the app over the same chunks with
   MiniSearch (BM25+ with its documented defaults: b 0.7, d 0.5, k 1.2;
   whole terms only, diacritics folded as its docs show); the two lists
   are merged with reciprocal rank fusion, k = 60 (Cormack, Clarke and
   Büttcher, SIGIR 2009). Top 50 chunks from each side, grouped by
   candidate, the best 10 candidates with the page, section and excerpt of
   their best chunk. Reranking is deferred until the evaluation shows it
   improves precision.
5. **Steps.** At most three model steps: tool steps, then the final step
   with the answer text and the `present` call in one; a greeting or a
   "what can you do" calls no tool and retrieves nothing.
6. **Presentation.** The call is checked against the tool results: every
   candidate must come from a tool result, or the answer fails with a
   clear error; the page must be one the tools cited for that candidate,
   or it is corrected to it and logged. The sources come only from the
   call; the text is never scanned for names.
7. **Views.** List, ranked list, comparison, profile, count and the three
   states, built from the tool results and the index: the app draws names,
   titles, counts and skill years; the order is the app's for a filter and
   the model's for a ranking, and a list after an exact filter holds every
   match the tool returned. One candidate, however presented, is a
   profile: the model's sentences on what was asked, then the name, title
   and CV, opened by the app's sentence when the model wrote none. A filter,
   count, list or no match opens with
   a sentence the app composes from the last filter call and its result
   (the count, and the criteria put into words from the filter arguments;
   a follow-up names the previous answer's size), so nothing in it is the
   model's; a plain list drops the model's reasons, a ranking keeps them.
   The model's text adds only what the view cannot show.
8. **Mission prompt.** Plain, warm and brief, with a helpful next question
   after a no match or an out-of-scope question; the pool at a glance; the
   candidate directory (id, name, headline) so names map to ids, with a
   clarifying question when two share a name; what each tool is for; a
   follow-up scopes the previous answer's ids, which the conversation
   carries; a refine that matches nobody is a no match.
9. **Progress.** "Understanding the question", then one line per tool
   ("Filtering the CVs", "Counting the CVs", "Reading 2 CVs", "Searching
   the CV text"), then "Writing the answer"; once answered the line says
   what happened ("Matched 7 of 30 CVs", "Read 2 CVs"), or "Answered" when
   no tool ran.
10. **Logging.** One structured line per request: the model actually
    used, from the provider's response; every tool call with its
    arguments, result and error; repairs, forced presentations and
    re-asked text; every model failure and what followed it (a retry, the
    fallback, the end); latency; the outcome; plus success and error
    counters per model.

The stream carries progress, then the final step's text once that step
ends (only then is it known to be the answer, not a tool step), then
exactly one answer (the text, its view, its sources, what was matched and
which model answered) or one error.

## Design system

- `design:lint` checks `DESIGN.md`, including dark-theme coverage and
  contrast in both themes.
- Mocks cover every view and state, one malformed and one empty answer,
  progress, errors, a slow path and an answer from the fallback, named.
- Component previews show every component in every state in both themes.

Done when `design:lint` reports 0 errors and 0 warnings, re-running the
export produces no diff, and every component previews in every state in
both themes.

## User interface

- The screen talks to one `ask` client module through an injectable
  transport: `POST /api/ask` in the app, the mock transport in previews
  and tests, without touching components.
- Stop aborts the request; the call ends without fallback.
- The selected model persists across reloads; the conversation does not.
- One progress line reads the current step and, once answered, what the
  search did (Retrieval and answering, 9); after ~10 s it reads a neutral
  "Taking longer than usual…". When the fallback answered, the settled
  line names the model.
- The answer text appears once the final step ends, rendered from Markdown
  with the design system's type; its view follows with it.
- Sources open the CV through the CV route (`/api/cvs/<id>#page=N`) in a
  preview panel beside the conversation, its pages drawn with pdf.js
  (`pdfjs-dist`, loaded only when a preview opens); Download saves the PDF
  under its readable name. Component previews serve `data/cvs` statically
  and link the same cards there.

## Evaluation

The golden questions (`scripts/evaluation/questions.ts`) cover every PRD use
case and the hard cases: acronyms, listing all CVs, lookups by role,
narrowing follow-ups including one that matches nobody, a field no CV
contains, greetings, out of scope. Expectations are rules over the seeds,
so they survive regeneration. Two candidates with the same name is a unit
test of the candidate directory, since the pool has none.

The eval runs per answer model, scores retrieval, composition and
citations (candidate and page) separately, counts invented candidates,
measures latency, and sets `recommended`: the entry that passes with the
best composition score, lower P95 breaking a tie.

| Metric | Threshold |
|--------|-----------|
| Invented candidates | 0 (hard fail) |
| Candidate citations | 100% |
| Page citations | ≥ 95% |
| Retrieval F1, exact questions | ≥ 95% |
| Free-text questions within bounds | ≥ 80% |
| Composition | ≥ 90% |
| States and greetings without sources | 100% |

A model that fails a threshold is not offered. The phase is done when the
thresholds are met, not when every question passes.

## Build order

1. **Contracts and design system** — done.
2. **UI against mocks** — done.
3. **Generation** — done: 30 unique seeds and PDFs are committed and a
   re-run is a no-op; photos wherever the paid step was run.
4. **Evaluation set** — done: rules and scorer tested without a model.
5. **Data layout** — done: the folders above exist, the loader and the CV
   route are tested, and the lint rule holds.
6. **Indexer** — done: every profile carries verified sources and
   `--check` meets its thresholds.
7. **Answering** — done: the tools, hybrid search, loop, presentation
   check, views and logging are unit-tested with mock models, and every
   PRD use case answers end to end against the mocks.
8. **Runs** — done when the vectors are rebuilt and the evaluation
   thresholds are met for every offered model.

Every phase also ends with lint, typecheck, build and tests clean.

## Plan complete when

- Every phase is done.
- PRD, Success criteria is verified by the evaluation.
- Lint, typecheck, build, tests and eval are clean on a fresh clone.
- Pool and index are committed; the commands in `AGENTS.md` work as
  written.
- Anything left over becomes its own plan in `docs/plans/<feature>.md`.

## Fresh clone

`.env.local` needs `GOOGLE_GENERATIVE_AI_API_KEY` (answers, extraction,
seeds, embeddings; photos when named), `PINECONE_API_KEY` and
`PINECONE_INDEX`, and `OPENROUTER_API_KEY` only while an OpenRouter entry
is enabled (`.env.example` lists them). Then
`npm ci`, `npm run index` (profiles and vectors from `data/cvs`), `npm run
eval` and `npm run dev`.

## Removals

The design leaves no place for: rule-based query planning (regex intent
hints, name inference from capitalisation or position), the query
rewrite, stopword and alias lists, substring matching of words, similarity
score floors, one vector per CV, the `openrouter/free` router entry, the
answer `kind`, the "CVs checked" count, name matching for lookups,
sources found by scanning the answer text, the extraction case and
zero-years heuristics, the regex role and seniority rules, `data/pdfs.json`,
`data/index.json`, `public/cvs`, and the mock transport's regex routing.

## Open questions

| # | Question | Blocks |
|---|----------|--------|
| 4 | Set the timeouts from the evaluation's measured P95. | Runs |

Resolved in 1.14: 6, the JSON index is enough for the pilot pool; 7, not
in v1, `lib` stays organised by domain (`AGENTS.md`, Conventions); 8, the
breaker counts one strike per call. Closed in 1.19: 2, the structured
answer it measured no longer exists. Closed in 1.21: 3, the Gemini
alternative is disabled and the menu comes from the evaluation; 5, the
fast middle tier is dropped with the fallback design; 9, there is no score
floor to tune.

## Changelog

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2026-09-22 | Initial version. |
| 1.1     | 2026-09-23 | Goal, status, no-new-features rule; design system phase; build order. |
| 1.2     | 2026-09-23 | Design system on design.md; Headless UI instead of shadcn/ui. |
| 1.3     | 2026-09-23 | Registry `vendor`; embedding rule; image model moved to open questions. |
| 1.4     | 2026-09-23 | Answer slots `primary`/`alternative`; acceptance criteria; per-model eval and thresholds. |
| 1.5     | 2026-09-23 | Slimmed; reliability rules; runbook removed. |
| 1.6     | 2026-09-23 | Open questions 6–8 (database, lib restructure, breaker); full role mix. |
| 1.7     | 2026-09-23 | Keeps decisions only: implementation details live in code, conventions in `AGENTS.md`, non-goals in the PRD; component previews replace `/dev/components`. |
| 1.8     | 2026-09-23 | Goal references PRD 1.5. User interface: CV preview is a placeholder until the Generation phase. |
| 1.9     | 2026-09-23 | Goal references PRD 1.6. User interface: sources link to the PDF at the cited page; no in-app viewer, no pool panel. |
| 1.10    | 2026-09-23 | Build order, phase 3: desktop and mobile widths (no stacked panels since 1.9). |
| 1.11    | 2026-09-24 | Open question 1 resolved: photos from the paid `image` entry, run only by name (no free image model on any provider). Generation pipeline: fixed EU roster shared with the mocks; seed prose restates structured facts; one ATS layout in three variants; `<name>_<surname>_cv.pdf`. Goal references PRD 1.9. |
| 1.12    | 2026-09-24 | Goal references PRD 1.10. User interface: sources open an in-app preview panel drawn with pdf.js, resizable, with download. |
| 1.13    | 2026-09-24 | Goal references PRD 1.11. Progress line wording. Embeddings dropped: retrieval is structured filters plus keyword search over page text; the `embed` entry, its rule and the embedding index go. |
| 1.14    | 2026-09-24 | Data access: the index and the CV PDFs. Indexer: committed `data/index.json`, extracted strings checked against the page text. Open questions 6–8 resolved (no database in v1, `lib` by domain, one breaker strike per call). |
| 1.15    | 2026-09-24 | Retrieval and answering: tool calls as one structured retrieval plan run by the server; answers without a compose call; complete filter and count lists. Open question 3: the free-tier budget of `alternative`. |
| 1.16    | 2026-09-24 | Goal references PRD 1.12. User interface: the settled progress line names the CVs checked; no timer. |
| 1.17    | 2026-09-24 | Goal references PRD 1.13 (empty state: CV count and an example question). |
| 1.18    | 2026-09-24 | Retrieval: upper bounds on years; a follow-up narrows only when the question refers back; a narrowed "nobody" names the other matches. |
| 1.19    | 2026-09-24 | Retrieval and answering rebuilt: embeddings in Pinecone, a rules-first plan, a streamed Markdown answer from a mission prompt with the conversation, sources from the CVs it names. Data access adds Pinecone; the `embed` entry returns; `check-models` checks each job with its production code; open question 2 closed, 9 added. PRD §5 (answer shapes), §8 step 3 and §10.1 predate this and are to be revised. |
| 1.20    | 2026-09-24 | Answer models: `openrouter-free` joins the menu and replaces Nemotron as the primary's fallback; OpenRouter's free allowance is shared per account. `check-models` dropped: model ids come from the provider's model list and are tried in the app. |
| 1.21    | 2026-09-24 | Goal references PRD 1.15, which completes the revision the 1.19 entry announced. Zero cost with pinned OpenRouter free models; Gemini answer entries disabled. Data layout by owner, `data/index/<id>.json`, the CV route. Pinecone recorded as a fixed decision. Indexer: sections, chunks, verified sources per field, the accuracy check. Retrieval and answering rebuilt: typed tools over the index, pool vocabularies, filter semantics, hybrid search with RRF, the presentation check, views from tool results, progress and logging. Reliability: SDK timeouts, tool-call repair, bounded steps; schema repair for extraction only. Evaluation: thresholds per metric, done when met. Removals, fresh clone; open questions 3, 5 and 9 closed. |
| 1.22    | 2026-09-25 | Goal references PRD 1.16. Views: a filter, count, list or no match opens with a sentence the app composes from the last filter call and its result; a plain list drops the model's reasons. Reliability: an answer that ends in text after a tool returned candidates gets its presentation from one forced call. This phase runs one model, Gemini 3.5 Flash-Lite, without a fallback; the OpenRouter entries move to pay-as-you-go and stay disabled; the evaluation's dry run states the cost or quota and the remaining credits. |
| 1.23    | 2026-09-25 | Goal references PRD 1.17. Views: a list after an exact filter is complete; one candidate is a profile of sentences plus name, title and CV, re-asked when wordless; a count's answer is the app's sentence alone. Reliability: tool schemas without length or range keywords; one retry after a 5xx; every model failure logged; an entry without a fallback is always tried; Gemini offered provisionally until its evaluation run. Build order: generation, data layout, indexer and answering done. Fresh clone on the Google key. |
| 1.24    | 2026-09-25 | Vector store: the index name is an environment value and lives only in `.env.local` (placeholder in `.env.example`), not here. |
