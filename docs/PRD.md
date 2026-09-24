# PRD: AI-Powered CV Screener

| Field   | Value        |
|---------|--------------|
| Version | 1.11         |
| Date    | 2026-09-24   |
| Status  | Approved     |
| Owner   | Product      |

This document describes what we are building and why. Technical decisions
and phases live in `docs/PLAN.md`, data schemas in `src/contracts`, and
engineering conventions in `AGENTS.md`. If a requirement conflicts with this
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
gets fast answers with visible, clickable evidence.

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
| 5 | Profile summary | "Summarize Jane Doe's profile" | Structured overview of one candidate |
| 6 | Aggregate | "How many candidates know Python?" | Exact count, optionally the list |
| 7 | Empty result | "Who knows Rust?" (nobody) | Explicit "no candidate matches" |
| 8 | Out of scope | "What's the weather today?" | Polite refusal, redirect to CV questions |

Use cases 1, 2 and 6 are the core of screening. 3, 4 and 5 support the
decision. 7 and 8 are trust cases: the product must never invent a
candidate or answer from outside the pool.

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

Every interface decision is checked against these five.

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
5. **Speed is felt.** The value of the product is speed. Long or empty
   waiting states destroy it; progress must be visible.

## 8. Core flow

1. **Entry.** Recruiter opens the tool and sees the pool size and
   suggested questions. Never a blank screen.
2. **Ask.** Types a question in natural language.
3. **Wait.** Sees which step of the search is running until the answer
   arrives, and afterwards how long it took.
4. **Answer.** Sees the answer in the shape that fits the question type,
   with sources.
5. **Verify.** Clicks a source; the original CV opens in a preview beside
   the conversation at the cited page, and the conversation stays as it
   was. The preview can be resized, downloaded and closed.
6. **Continue.** Asks a follow-up that builds on the previous answer
   ("of those, who speaks German?") or starts a new search.
7. **Exit.** Can copy an answer.

## 9. Information architecture

**One column: the conversation.**
- Messages with their sources, empty state, loading state and input.
- Header: logo, product name and a light/dark toggle; the default follows
  the system setting and the toggle overrides it. The pool size is shown in
  the empty state (§8 step 1), not in the header.

**Mobile (secondary):** the same column at full width.

## 10. Functional requirements

### 10.1 Answers
- Answers are based only on the content of the CVs in the pool.
- The screener reads only the CV documents; any structured data it uses
  is derived from them.
- Every answer carries its sources (one or more CVs).
- Each use case in §5 renders in its own shape.
- Empty result and out-of-scope are distinct, explicit states.

### 10.2 Sources
- A source is shown in the answer as the candidate's name and the word
  "CV" with a link mark; the cited page is not displayed.
- It opens the original PDF at the cited page in a preview panel beside
  the conversation, with a download; outside the app (previews, copied
  text) it is a link to the PDF.

### 10.3 Conversation
- Follow-up questions use the context of previous answers.
- The conversation persists for the session.

### 10.4 Pool
Removed in 1.6: the pool is reached through answers and their sources.

### 10.5 Model selection
- The recruiter selects a model by name, shown with the logo of the company
  that made it.
- The recommended model is preselected.
- The selector is part of the composer (the question input), not the
  header.

### 10.6 States
- Empty state with pool size and example questions.
- Loading state that shows progress.
- Error state with a plain-language message and a way to retry.

## 11. Success criteria

- A filter question over the pool returns a correct, sourced list in under
  ~10 seconds on the recommended mode.
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

None open. Resolved in v1.2:

- "Note candidates for follow-up" is deferred; v1 ships "copy an answer"
  only (§8 step 7).
- Sources open the original PDF at the cited page (§10.2).

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
