# PLAN: AI-Powered CV Screener

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.20                                     |
| Date    | 2026-09-24                               |
| Status  | Active                                   |
| Owner   | Engineering                              |
| Goal    | Deliver the v1 pilot defined in PRD 1.13 |

If the code and this document disagree, change this document first, then
the code. This plan is not extended with new features; a new feature gets
its own plan in `docs/plans/<feature>.md`.

---

## Environment

- Cost ceiling is zero: every model used by default is on a free tier.
  A paid model may be used only when labelled paid and never by default.
- Every script is resumable (skip what already exists) and can be forced
  to regenerate.

## Data access

The app reads only the index, the CV PDFs and the CV vectors in Pinecone.

## Model registry

The backend talks to models only through the registry. Model ids come
from the provider's model list, never from memory.

### Answer models

- The recruiter chooses between registry entries (PRD, Model selection).
  Entries are named slots: `primary` and `alternative` on the Gemini API
  free tier, and `openrouter-free`, which OpenRouter sends to any of its
  free models that is up, so the recruiter can switch when one is busy or
  out of requests. No name or description claims one answers better than
  another.
- `openrouter-free` is also the primary's fallback. OpenRouter's free
  models share one daily allowance per account.
- `recommended` stays on `primary` until the eval sets it (Evaluation).

### Acceptance criteria

An answer model enters the registry only if it meets all four:

1. **Capabilities.** It does the jobs the registry gives it: streamed
   answers, and for `primary` the query rewrite.
2. **Correctness.** It meets every threshold in Evaluation.
3. **Latency.** P95 end-to-end latency per question is at most ~10 s
   (PRD, Success criteria).
4. **Free-tier budget.** A working day of use fits the provider's
   free-tier daily limit.

Until the eval exists, only criterion 1 applies.

### Reliability

- Every model call has a first-output limit and a total budget, set from
  the measured P95 time to first token.
- A timeout goes straight to the fallback model, never a retry on the
  same model. A streamed answer can fall back only before its first word;
  after that a failure ends it with an error, since two models' text would
  mix.
- A response that fails its schema gets one repair attempt, then the
  fallback.
- A per-entry circuit breaker skips a failing primary for a cooldown.

## Generation pipeline

~30 candidates: frontend 6, backend 6, data 4, DevOps 4, QA 4, product 3,
fullstack 1, mobile 1, security 1. The roster (id, name, headline, role,
seniority, location) is fixed in the generator, EU names in EU locations;
the mock pool mirrors it and a test keeps them equal. Three steps:

1. Seeds: one structured profile per candidate, written by the `generate`
   entry from the fixed fields; the prose (summary, per-job description
   and highlights) restates the structured fields only, so eval rules stay
   exact.
2. Photos: one AI-generated photo per candidate from the `image` entry,
   which is paid, so the step runs only when named; a failed photo is
   reported, never fatal, and the CV simply has no photo.
3. PDFs: one single-column layout after the sample CV the pilot was given
   (photo, name, accent headline, contact line, uppercase section headings
   over hairlines), in three variants (font, date style) so formats differ
   (PRD, Problem) while every CV parses; the accent is the design system's
   `primary-text`; the photo is embedded when it exists. Files are
   `public/cvs/<name>_<surname>_cv.pdf`.

## Indexer

For each PDF: text per page, one structured profile extracted by the
`extract` entry, and skills, languages and roles normalised; then one
vector per CV from the `embed` entry, stored in Pinecone under the
candidate id.

The text and profiles are one committed JSON file, `data/index.json`; the
vectors live only in Pinecone and are rebuilt from the index
(`npm run index -- --step vectors`). Extracted strings are checked against
the page text: they keep the CV's capitalisation, and the role follows the
headline when it names one.

## Retrieval and answering

Retrieval picks the CVs; the model answers from those CVs only, in its own
words. Every step is its own module behind an interface
(`src/lib/answering`, `src/lib/vector`, `src/lib/ai`), composed in one
place, so each is tested alone and Pinecone or a model can be replaced in
one adapter.

1. **Plan, by rules.** A question that refers back ("of those", "is he…")
   reads the previous answer's candidates; one that names a candidate
   reads that CV; anything else is a similarity search. A fragment
   follow-up ("under 2 years?") is first rewritten into a standalone query
   by the `primary` entry, using the earlier questions.
2. **Retrieve.** The query is embedded and Pinecone returns the closest
   CVs; matches below a score floor are dropped, and when even the best is
   weak nothing is retrieved (a greeting or "how can you help").
3. **Answer.** The chosen answer model streams Markdown, given its mission
   (a CV screening assistant for a recruiter: what it can and cannot do,
   how it writes), the pool at a glance, the retrieved CVs' full text and
   the conversation so far.
4. **Sources.** The CVs the answer names, among those retrieved, become
   its CV cards, each opened at the page that best matches the question.

The stream carries progress, the answer text as it is written, then
exactly one answer (the whole text, its sources and how many CVs it was
written from) or one error.

Known limits, accepted for the pilot: counts and lists are the model's
reading of the retrieved CVs, not an exact search; the score floor can
drop a relevant CV; the answer is not validated beyond its sources coming
only from retrieved CVs.

## Design system

- `design:lint` checks `DESIGN.md`, including dark-theme coverage and
  contrast in both themes.
- Mocks cover every answer kind, one malformed and one empty answer,
  progress, errors, a slow path (answer after a schema repair) and a very
  slow path (answer from the fallback).
- Component previews show every component in every state in both themes.

Done when `design:lint` reports 0 errors and 0 warnings, re-running the
export produces no diff, and every component previews in every state in
both themes.

## User interface

- The screen talks to one `ask` client module: mocks during the UI
  phase, `POST /api/ask` from the API phase, without touching components.
- Stop aborts the request; the call ends without fallback.
- One progress line reads the current step (search, read, write) and,
  once answered, how many CVs the answer was written from; after ~10 s it
  reads a neutral "Taking longer than usual…". Fallback is never shown.
- The answer appears as it is written, rendered from Markdown with the
  design system's type; its CV cards follow once it is complete.
- Sources open the CV's PDF at the cited page
  (`/cvs/<name>_<surname>_cv.pdf#page=N`) in a preview panel beside the
  conversation, its pages drawn with pdf.js (`pdfjs-dist`, loaded only
  when a preview opens) so no browser viewer controls appear. Download
  saves the PDF; outside the screen (component previews) the same card is
  a link.

## Evaluation (built last)

15–20 golden questions cover every PRD use case. Expectations are rules
evaluated against `data/seeds`, so they survive regeneration. The eval
runs per answer model, scores retrieval and composition separately,
measures end-to-end latency, and sets `recommended`: the entry that
passes all criteria with the best correctness, lower P95 breaking a tie.

| Metric | Threshold |
|--------|-----------|
| Invented candidates | 0 (hard fail) |
| Sourcing | 100% |
| Correctness | ≥ 90% |

A model that fails any threshold leaves the registry.

## Build order

1. **Contracts** — closed with Open questions 2–5 pending quota.
2. **Design system** — done as defined in Design system.
3. **UI against mocks** — done when every step of the PRD core flow works
   with mock data at desktop and mobile widths.
4. **Generation** — done when 30 unique seeds, photos and PDFs are
   committed and a re-run is a no-op.
5. **Indexer** — done when the index is committed and three profiles are
   spot-checked against their PDFs.
6. **API** — done when every PRD use case returns the right `kind` end to
   end and progress stages mirror the tool calls.
7. **Eval** — done when all golden questions pass.

Every phase also ends with build and tests clean.

## Plan complete when

- Every phase is done.
- PRD, Success criteria is verified.
- Lint, typecheck, build, tests and eval are clean on a fresh clone.
- Pool and index are committed; the commands in `AGENTS.md`
  work as written.
- Anything left over becomes its own plan in `docs/plans/<feature>.md`.

## Open questions

| # | Question | Blocks |
|---|----------|--------|
| 3 | `alternative` fails the latency criterion and the free-tier budget (Gemini 3.6 Flash: 5 requests a minute, 20 a day, at 2 calls per question); choose a replacement. | API |
| 4 | Set the first-output and total limits from the measured P95 time to first word. | API |
| 9 | Tune the retrieval score floor on the 30 indexed CVs (the server log lists each question's scores). | API |
| 5 | Evaluate `lfm-2.5-2.6b` as a fast middle tier before the Gemini fallback. | Eval |

Resolved in 1.14: 6, the JSON index is enough for the pilot pool; 7, not
in v1, `lib` stays organised by domain (`AGENTS.md`, Conventions); 8, the
breaker counts one strike per call. Closed in 1.19: 2, the structured
answer it measured no longer exists.

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
