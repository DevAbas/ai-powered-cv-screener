# PRD: AI-Powered CV Screener

| Field   | Value        |
|---------|--------------|
| Version | 1.23         |
| Date    | 2026-09-26   |
| Status  | Approved     |
| Owner   | Product      |

This document describes what we are building and why. How it is built
lives in `README.md`, data schemas in `src/contracts`, and engineering
conventions in `AGENTS.md`. If a requirement conflicts with this
document, update this document first, then the code.

---

## 1. Problem

A recruiter works with a pool of candidate CVs and must decide who fits an
open vacancy. Three things make this slow and error-prone:

1. Every CV has a different format. The same skill appears in different
   sections, worded differently.
2. The vacancy requirements exist only in the recruiter's head. Fit has to
   be recomputed manually for every CV.
3. A pool of ~30 CVs cannot be held in memory. By the fifteenth CV, the
   third is forgotten.

Today the recruiter either reads every CV (slow) or keyword-searches
(shallow: "React" in a CV does not mean React experience).

## 2. Users

**Primary: Recruiter / hiring manager.**
- Non-technical.
- Works long sessions in the tool.
- Screens the same pool against different vacancies over time.
- Cannot act on an answer without verifying it in the source CV. Trust is
  earned per answer, not once.

## 3. Product promise

The recruiter asks questions about a candidate pool in plain language and
gets correct answers, each with visible, clickable evidence. Accuracy comes
before speed: a slower right answer beats a fast wrong one.

The product does not make the hiring decision. It makes the decision
faster and better-supported.

## 4. Pilot scope (v1)

- One recruiting team, single user at a time.
- One candidate pool of ~30 CVs spanning several roles (e.g. frontend,
  backend, data, DevOps, QA, product).
- The recruiter queries the pool against whichever vacancy they are working
  on. There is no "vacancy object" in v1; the vacancy lives in the question.
- Runs locally on the recruiter's machine.
- Goal of the pilot: validate that question-driven screening with visible
  evidence is faster and more trusted than manual reading.

## 4.1 Pilot data

The pilot pool consists of synthetic CVs. No real personal data is used,
for privacy reasons.

Synthetic CVs are produced by a repeatable generation pipeline, not by
hand, so the pool can be regenerated or extended for future pilots.
The pipeline uses AI to generate both the CV text and the candidate
photo. Each CV must look realistic: PDF format, a photo, contact
details, work experience, skills, education and languages, spanning the
roles in §4. Every CV must be unique.

The pool is generated once and prepared before the recruiter opens the
tool. Generating CVs from the interface is out of scope (§12).

## 5. Use cases

Each use case is a type of question the recruiter asks. Each requires a
different answer shape.

| # | Use case | Example | Expected answer shape |
|---|----------|---------|-----------------------|
| 1 | Filter | "Who has React and TypeScript?" | List of candidates, each with a source |
| 2 | Rank | "Top 3 for a Frontend Lead role" | Ordered list with a short reason each |
| 3 | Compare | "Compare Andrei and Elena on backend experience" | Side-by-side of two candidates |
| 4 | Single fact | "Where did Lena work last?" | Short fact with one source |
| 5 | Profile summary | "Summarize Jane Doe's profile" | A short summary in prose, with the candidate's name, title and CV |
| 6 | Aggregate | "How many candidates know Python?" | Exact count, optionally the list |
| 7 | Empty result | "Who knows Rust?" (nobody) | Explicit "no candidate matches" |
| 8 | Out of scope | "What's the weather today?" | Polite refusal, redirect to CV questions |
| 9 | List all | "Show all CVs" | Every candidate, each with a source |
| 10 | Lookup by role | "The security engineer's CV" | The candidate(s) in that role |
| 11 | Follow-up | "Of those, who speaks German?" | The previous answer's candidates, narrowed; explicit "no candidate matches" when none |
| 12 | Greeting, help | "hey", "What can you do?" | A short reply, without sources |

Use cases 1, 2 and 6 are the core of screening. 3, 4, 5, 9, 10 and 11
support the decision. 7 and 8 are trust cases: the product must never
invent a candidate or answer from outside the pool.

An answer that names candidates carries one source per candidate, linking
to the page of the CV that supports it. Greetings and out-of-scope answers
carry none. A count is exact, never an estimate.

## 6. What the recruiter evaluates on

These are the criteria real screening uses. The product must be able to
answer questions about all of them, so candidate data must capture them.

**Hard filters**
- Role and seniority
- Total years of experience
- Skills, with years per skill where available
- Location, remote/relocation willingness
- Work authorization
- Languages with proficiency level
- Education: degree, field, institution, year
- Availability / notice period

**Ranking signals**
- Employment history: company, title, industry, dates
- Job stability (derived from dates)
- Leadership experience
- Certifications

## 7. UX principles

Every interface decision is checked against these six.

1. **Evidence, not answers.** Every answer shows which CVs it came from.
   One click opens the CV at the relevant page, beside the conversation.
2. **Built for comparison, not conversation.** Answers favour lists,
   tables and side-by-side layouts over paragraphs. The recruiter is
   filtering, not chatting.
3. **Context is not lost.** The conversation keeps every question and
   answer for the session, and follow-ups build on them. Not just a
   scrollback.
4. **Uncertainty is visible.** "No match", "not enough information" and
   "outside the pool" are explicit, distinct states. Never a confident
   guess.
5. **Accuracy first, progress visible.** A wrong answer costs more than a
   slow one. While the answer is computed, progress is visible; afterwards
   the line says what was searched.
6. **Plain, warm, brief.** Answers read like a helpful colleague. After a
   no match or an out-of-scope question they offer a next question. The
   tone never adds a candidate or a fact the data does not contain.

## 8. Core flow

1. **Entry.** Recruiter opens the tool and sees how many CVs there are to
   review and example questions in the input, typed one after another so
   the range of questions is seen. Never a blank screen.
2. **Ask.** Types a question in natural language.
3. **Wait.** Sees which step of the search is running until the answer
   arrives, and afterwards what it did, in plain words ("Matched 7 of 30
   CVs"), or nothing about CVs when none were searched.
4. **Answer.** Sees the answer in the shape that fits the question type,
   with sources.
5. **Verify.** Clicks a source; the original CV opens in a preview beside
   the conversation at the cited page, and the conversation stays as it
   was. The preview can be resized, downloaded and closed.
6. **Continue.** Asks a follow-up that builds on the previous answer
   ("of those, who speaks German?") or starts a new search.

## 9. Information architecture

**One column: the conversation.**
- Messages with their sources, empty state, loading state and input.
- Header: logo, product name and a light/dark toggle; the default follows
  the system setting and the toggle overrides it. Pressing the toggle plays
  a short switch click, so the change of mode is heard as well as seen; it
  is the interface's only sound. The pool size is shown in the empty state
  (§8 step 1), not in the header.

**Mobile (secondary):** the same column at full width.

## 10. Functional requirements

### 10.1 Answers
- Answers are based only on the content of the CVs in the pool.
- The screener reads only the CV documents; any structured data it uses
  is derived from them.
- An answer that names candidates carries one source per candidate;
  greetings and out-of-scope answers carry none.
- Counts come from an exact count over the pool.
- A filter, count or list opens with a sentence the product composes from
  the search ("There are 7 candidates with React experience. Here are
  their details."), so its count and criteria are the data's. The model's
  text adds only what the data cannot show; it never restates counts or
  facts, and never adds a candidate or fact the data does not contain.
- A list shows four candidates by default and the rest on request.
- An answer about one candidate, whether named ("Where did Lena work
  last?") or the one a question's criteria match ("Who is the mobile
  engineer?"), is the model's two or three sentences on what was asked,
  with the candidate's name, title line and CV; the details are in the
  CV.
- Each use case in §5 renders in its own shape.
- Empty result and out-of-scope are distinct, explicit states.

### 10.2 Sources
- A source is shown in the answer as the word "Resume" with a document
  mark beside the candidate's name; the cited page is not displayed.
- It opens the original PDF at the cited page in a preview panel beside
  the conversation, with a download; outside the app (previews) it is a
  link to the PDF.

### 10.3 Conversation
- Follow-up questions use the context of previous answers.
- The conversation persists for the session.

### 10.4 Pool
Removed in 1.6: the pool is reached through answers and their sources.

### 10.5 States
- Empty state with the number of CVs and example questions typed in the input.
- Loading state that shows progress.
- Error state with a plain-language message and a way to retry.

## 11. Success criteria

- Filter, count, compare and profile questions return correct, sourced
  answers on the offered model, measured by the evaluation against
  the thresholds in `scripts/evaluation/score.ts` before a model is
  offered.
- Response time is reported by the evaluation, not a pass/fail criterion.
- Every answer can be traced to a CV in at most one click.
- Empty-result and out-of-scope questions never produce an invented
  candidate or fact.
- A recruiter who has never seen the tool can ask a useful question
  within 30 seconds of opening it, guided by the empty state.

## 12. Non-goals (v1)

Stated explicitly so nothing is inferred from omission.

- No authentication, user accounts or roles.
- No multi-user or concurrent access.
- No CV upload from the interface; the pool is prepared in advance.
- No vacancy object, job-description matching or scoring model.
- No editing, tagging or annotating CVs.
- No persistence of conversations across restarts.
- No deployment or hosting; runs locally.
- No pools larger than ~50 CVs.
- No integrations with ATS, email or calendar.

## 13. Open questions

None open. Resolved:

- "Note candidates for follow-up" is deferred (1.2).
- Sources open the original PDF at the cited page (1.2, §10.2).
- Copying an answer is dropped: it doesn't help the recruiter screen (1.14, §8).

## 14. Changelog

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2026-09-22 | Initial version. |
| 1.1     | 2026-09-22 | Add §4.1 Pilot data: synthetic CVs from a generation pipeline. |
| 1.2     | 2026-09-22 | §10.1: screener reads only the CV documents. §8/§13: both open questions resolved (notes deferred; PDF preview at page level). |
| 1.3     | 2026-09-23 | §10.5: model selected by name with provider icon, recommended preselected, selector in the composer. §9: selector removed from the header. |
| 1.4     | 2026-09-23 | Light/dark toggle in the header. |
| 1.5     | 2026-09-23 | Header: conventions in `AGENTS.md`, schemas in `src/contracts`; no stack in PLAN. §10.5: model shown with its maker's logo, not the routing provider's. |
| 1.6     | 2026-09-23 | Chat only: the pool panel and CV list are removed. §7, §8 step 5, §9, §10.2: sources link to the original PDF at the cited page, opened in a new tab. §10.4 removed. |
| 1.7     | 2026-09-23 | §8 step 3: progress is shown while searching, then the answer (not streamed text). |
| 1.8     | 2026-09-24 | §9: header shows the logo and product name; the pool size moves to the empty state only. |
| 1.9     | 2026-09-24 | §10.2: a source shows the name and "CV" with a link mark; the page is where the link lands, not text. |
| 1.10    | 2026-09-24 | §7, §8 step 5, §10.2: a source opens the CV in a resizable preview beside the conversation, with download and close, instead of a new tab. |
| 1.11    | 2026-09-24 | §5: examples name candidates in the pilot pool. §8 step 3: one progress line shows the current step, then the time the search took. |
| 1.12    | 2026-09-24 | §8 step 3: once answered, the progress line says how many CVs were checked instead of the time it took. |
| 1.13    | 2026-09-24 | §8 step 1, §10.6: the empty state shows the number of CVs and one example question in the input, instead of suggested-question buttons. |
| 1.14    | 2026-09-24 | §8, §13: copying an answer is dropped; the core flow ends with a follow-up or a new search. |
| 1.15    | 2026-09-24 | Accuracy before speed (§3, §7.5, §11). §5: list all, lookup by role, follow-up and greeting use cases; one source per named candidate, none on greetings and out-of-scope answers, exact counts. §7.6: plain, warm, brief, with a next question after no match or out of scope. §8 step 3: the progress line says what was searched. §10.1: the text frames the data. §10.2: copied text removed. §11: correctness measured by the evaluation; response time reported. §13: resolutions dated. |
| 1.16    | 2026-09-24 | §10.1: a filter, count or list opens with a sentence the product composes from the search; four candidates by default. §10.2: the source reads "Resume". |
| 1.17    | 2026-09-25 | §5 row 5 and §10.1: an answer about one candidate is prose plus the name, title and CV. §10.5: the selector appears only when more than one model is offered. |
| 1.18    | 2026-09-25 | Header and §11: the plan is retired; how it is built lives in `README.md`, the evaluation thresholds in `scripts/evaluation/score.ts`. |
| 1.19    | 2026-09-25 | §10.5 Model selection removed: one model answers and the recruiter does not choose it; §10.6 States becomes §10.5. §11: the offered model. |
| 1.20    | 2026-09-25 | §9: the light/dark toggle plays a short switch click, the interface's only sound. |
| 1.21    | 2026-09-26 | §8 step 1: the headline names the vacancies the pool could fill, one after another. |
| 1.22    | 2026-09-26 | §8 step 1: the cycling vacancies of 1.21 are dropped; the headline stays "Find The Right Candidates". |
| 1.23    | 2026-09-26 | §8 step 1, §10.5: the input's placeholder types the example questions one after another. |
