# PLAN: AI-Powered CV Screener

| Field   | Value                                    |
|---------|------------------------------------------|
| Version | 1.11                                     |
| Date    | 2026-09-23                               |
| Status  | Active                                   |
| Owner   | Engineering                              |
| Goal    | Deliver the v1 pilot defined in PRD 1.9  |

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

The app reads only the index and the embeddings.

## Model registry

The backend talks to models only through the registry. Model ids are
pinned only after `check-models` passes and are never taken from memory.

### Answer models

- The recruiter chooses between registry entries (PRD, Model selection).
  Entries are named slots, `primary` and `alternative`; no name or
  description claims one answers better than the other.
- `recommended` stays on `primary` until the eval sets it (Evaluation).

### Acceptance criteria

An answer model enters the registry only if it meets all four:

1. **Capabilities.** `check-models` passes for tools, structured output
   and streaming.
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
  same model.
- A response that fails its schema gets one repair attempt, then the
  fallback.
- A per-entry circuit breaker skips a failing primary for a cooldown.

### Embeddings

A question is embedded only with the model that built the index. There
is no fallback at query time; a different model may be used only to
rebuild the whole index.

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
3. PDFs: one ATS-friendly single-column layout in three variants (font,
   heading colour, date style), so formats differ (PRD, Problem) while
   every CV parses; the photo is embedded when it exists. Files are
   `public/cvs/<name>_<surname>_cv.pdf`.

## Indexer

For each PDF: text per page, one structured profile extracted by the
`extract` entry, skills, languages and roles normalised, and one
embedding per page.

## Retrieval and answering

Retrieval is required; the whole pool is never placed in a prompt.

- `search_cvs` filters the profiles deterministically and returns the
  exact count; it can scope a follow-up to the previous answer.
- `get_cv` returns one profile with its pages, for compare, fact and
  profile questions.
- Evidence pages are found by embedding similarity, scoped to the matched
  candidates.

Flow: validate the request → retrieve (each tool call is a progress
stage) → compose one structured answer from the retrieval result only →
validate the answer against the retrieval result → stream progress, then
exactly one answer or error.

Validation against the retrieval result: unknown candidate ids are
dropped (an emptied filter or rank becomes `empty`), the count comes from
`search_cvs`, every cited page must be a retrieved page, and an unknown id
in compare, fact or profile becomes `insufficient`.

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
- Progress stages mirror the tool calls; after ~10 s a neutral "Taking
  longer than usual…" line appears. Schema repair and fallback are never
  shown.
- Sources link to the CV's PDF at the cited page
  (`/cvs/<name>_<surname>_cv.pdf#page=N`), opened by the browser. No
  in-app PDF viewer.

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
5. **Indexer** — done when the index and embeddings are committed and
   three profiles are spot-checked against their PDFs.
6. **API** — done when every PRD use case returns the right `kind` end to
   end and progress stages mirror the tool calls.
7. **Eval** — done when all golden questions pass.

Every phase also ends with build and tests clean.

## Plan complete when

- Every phase is done.
- PRD, Success criteria is verified.
- Lint, typecheck, build, tests and eval are clean on a fresh clone.
- Pool, index and embeddings are committed; the commands in `AGENTS.md`
  work as written.
- Anything left over becomes its own plan in `docs/plans/<feature>.md`.

## Open questions

| # | Question | Blocks |
|---|----------|--------|
| 2 | Answer acceptance run (`--repeat 20`, 0 final failures after repair) is pending quota; 7/7 clean so far. If it fails, answer payload fields become required-nullable. | API |
| 3 | `alternative` fails the latency criterion; choose a replacement. | API |
| 4 | Set the first-output and total limits from measured P95. | API |
| 5 | Evaluate `lfm-2.5-2.6b` as a fast middle tier before the Gemini fallback. | Eval |
| 6 | Add a database in `lib/db` following the vercel/chatbot structure; candidate PGlite + pgvector + Drizzle. | Indexer |
| 7 | Restructure `lib/` in the vercel/chatbot style. | Indexer |
| 8 | Circuit breaker counts one strike per call, not per attempt. | Indexer |

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
