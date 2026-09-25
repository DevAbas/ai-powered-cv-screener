# AI-Powered CV Screener

A recruiter has about thirty CVs and one open job. This tool lets them ask
questions about the CVs in plain language. For example: "who has five years
of React and speaks German?" The answer lists the candidates that match.
Every fact links to the page of the CV where it was found. The recruiter
checks the evidence, not the model.

The tool does not decide who to hire. It makes that decision faster and
easier to support.

This is a pilot. One team, one pool of CVs, running on the recruiter's own
computer.

## Applied solution for the core requirements

### CV generation

`npm run generate` builds the sample pool of 30 CVs. It has three steps,
and each step skips what already exists.

- **Seeds.** The pipeline starts from a fixed list of 30 candidates, written
  by hand in the code: name, headline, role, seniority and an EU city. The
  roles are mixed: 6 frontend, 6 backend, 4 data, 4 DevOps, 4 QA, 3 product,
  and one each of full-stack, mobile and security. For each one, Gemini
  writes the rest of the CV as JSON: summary, skills with years, jobs with
  dates, education, languages, certifications. The JSON is checked against
  the candidate schema and a set of rules, for example that the years of
  experience fit the seniority, and that no two candidates share the same
  job history. Each seed is saved as a file. It is the ground truth for the
  tests later.
- **Photos.** The Gemini image model makes one portrait per candidate. This
  step costs money, so it runs only when named.
- **PDFs.** One CV per seed is rendered with react-pdf from one template.
  The template has three variants (font and date style), so the CVs do not
  all look the same. The photo is placed in the header. Every CV has at
  most three pages. The same seed always gives the same PDF bytes.

### RAG workflow

`npm run index` turns the PDFs into something the model can use. It has
three steps.

- **Text.** pdf.js reads the text of each page. The text is split into
  sections by the CV's own headings: summary, skills, experience,
  education, languages, leadership, certifications. Each section on each
  page is one chunk.
- **Profile.** Gemini reads the chunks and writes a structured profile in
  the same shape as the seed. Next to each item, it copies the CV's own
  line. The app then finds every field in the CV text, as whole words on a
  page. So each fact has a source page, and a fact that is not in the text
  is dropped. The result is one JSON file per CV, the index entry.
- **Vectors.** Each chunk is embedded with Gemini's embedding model and
  stored in Pinecone, with the candidate id, section and page as metadata.

The index has an accuracy check: every indexed profile is compared with the
seed its CV came from, field by field.

At question time, the model does not read the CVs. It calls tools:

- `find_candidates` and `count_candidates` run exact filters over the index
  in memory: skills and years, languages and levels, role, seniority, city
  or country, education, employers, notice period, work mode. They return
  each match with its evidence and page.
- `get_candidates` returns the full profile of the candidates named, with
  the page of every field.
- `search_cv_text` runs a hybrid search for free text: BM25 over the chunks
  and a vector search in Pinecone, both limited to the same candidates, and
  the two rankings joined with reciprocal rank fusion. It returns the best
  matches with the page and the text that matched.

So every answer is grounded on the CVs: the model can only say what a tool
returned.

### Chat interface

The screen is one page in Next.js. A text box takes the question. An
example question shows what to ask. The answer streams in as it is made:
first the progress ("understanding", "searching", "writing"), then the
model's text, then the view.

Asked "Who has React and TypeScript?", the app opens with its own
sentence, "There are 4 candidates with React and TypeScript experience.
Here are their details.", and lists the four, each with their years of
React and TypeScript and a link to the CV page that states them.

![A list answer: the app's sentence, four candidates with their years of React and TypeScript, and a link to each CV page](docs/images/answer-list.png)

Screenshot from the component previews.

The view depends on the question. A filter or a search gives a list of
candidates with the facts that matched. A comparison gives the candidates
side by side. A question about one person gives their profile. A count, no
match, or a question the CVs cannot answer gives a short sentence. Each
candidate in a view has a link to the source: it opens the CV in a panel
next to the chat, on the page where the fact was found. The panel can be
resized and closed.

A follow-up question sees the previous answer, so "which of them speak
German?" narrows the last list. One model answers; the recruiter does not
choose it. The screen has a light and a dark mode.

## Architecture

### How an answer comes to be

This is the agentic form of RAG: retrieval is a set of tools the model
calls, not text pasted before the question. The CVs are indexed once,
before use. At question time the model reads only what the tools return,
and the app checks every candidate and page it names.

![The chat screen sends the question to the ask route, which runs an answer loop with the Gemini API. The model calls tools that run exact queries over the in-memory index or a hybrid search over BM25 and Pinecone. The route builds the view, checks the sources and streams the answer. A source link opens the CV PDF at the cited page. Before use, the generate and index scripts write the CVs, the profile files and the vectors.](docs/images/architecture.svg)

### Layers

The code is grouped by what it does, not by technical layer. `src/lib` has
five domain modules. Each one can be used from a route, a script or a test,
without React:

- `screening` is the core. One question goes in, one answer comes out. It
  runs the answer loop, defines the tools the model can call, collects the
  results and builds the view.
- `candidates` owns the pool. It reads and checks the index, builds an
  entry from a CV, checks a profile against the CV's text, and knows which
  values exist in the pool.
- `search` finds CV text. It has BM25 over the section chunks, a vector
  store behind an interface (a Pinecone adapter and an in-memory fake), and
  rank fusion to join the two.
- `models` talks to the language models. It has the list of models and what
  they can do, the provider clients, routing with a circuit breaker, retry
  rules, and structured output with schema repair.
- `conversation` is what the recruiter sends and sees: the request client,
  the progress messages, the answer as text.

Three rules keep this shape:

- **Dependencies go one way.** Routes and scripts use `lib`. `lib` uses
  `contracts`. A module never imports a component, a hook or a script.
  `lib` never imports Next.
- **The API route wires things together.** It loads the pool once. It
  creates the real embedder, vector store and BM25 index. It puts them in
  one bundle and gives it to the screening module. Tests give fakes instead.
  There is no container and no injection framework. Only parameters.
- **Contracts are the shared language.** `src/contracts` holds the Zod
  schemas for the request, the events, the candidate profile, the tool
  inputs and the view. The route checks what comes in. The client types
  what goes out. Every tool call and every presentation call is checked
  against them before use.

## Decisions and why

- **Typed tools over the index, not a plain RAG prompt.** Most recruiter
  questions are exact: years, languages, roles, counts. These run as
  queries, so the answer is the query result and the model only puts it in
  words. Search by meaning is kept for the questions that need it. A
  question the filters cannot express falls to the text search, which ranks
  its results and does not promise a complete list.
- **The app writes the counts, the lists and the first sentence.** A count
  comes from the tool. A list after a filter has every match. The first
  sentence of a view comes from the filter and its result. The model cannot
  drop a candidate or add one. The opening sentence is a template, and a
  count answer drops whatever the model wrote.
- **Every cited page is checked.** The model names candidates and pages. If
  a candidate was not returned by a tool, the answer fails. If a page was
  not cited by a tool, it is replaced with one that was. An answer that
  names an unknown candidate fails as a whole, with a Retry button, rather
  than showing the part that could be verified.
- **Sources are found in the CV text during indexing.** Each profile field
  is found as whole words on a page. So the link the recruiter clicks opens
  where the fact is written. A fact the model read correctly but the CV
  does not state in those words is dropped.
- **One fixed model, named in the environment.** One behaviour to tune the
  prompt for, and no choice for the recruiter. The model's name lives in
  `.env.local`, so a swap is a configuration change, not a commit, and the
  evaluation can run a candidate first. There is no fallback yet, so an
  outage or a spent quota shows an error and a Retry button.
- **Pipelines can be resumed, and have dry runs.** Every script skips what
  already exists and can be forced to redo it. It prints its work list and
  cost estimate before it calls a model. After a change to a seed or the
  template, the old file stays until the step is run with `--force`.
- **Evaluation lives in the code.** The test questions carry their expected
  answers as rules over the seed data. So they still work after the pool is
  regenerated. The scorer measures retrieval, composition and citations
  separately. Each question needs a rule, not just an expected answer, and
  the run pays for model calls.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Model access | Vercel AI SDK 7; Google Gemini through the Gemini API |
| Schemas | Zod 4, one contract per area in `src/contracts` |
| Search | MiniSearch for BM25, Pinecone for vectors, reciprocal rank fusion |
| PDF | pdf.js for text and the in-app preview; react-pdf to render the sample pool |
| Styling | Tailwind 4 with tokens generated from `DESIGN.md`, tailwind-variants, Headless UI |
| Tooling | Vitest, Storybook 10, ESLint, tsx for the scripts |
| Runtime | Node 22, from `.nvmrc` |

## Testing

Unit tests sit next to the code they test. They run in Node, with fakes for
the model, the embedder and the vector store. The ingestion pipeline has an
accuracy check: it compares every indexed profile with the seed its CV came
from, field by field. The evaluation runs the test questions through the
real answer pipeline and scores each model against fixed thresholds. It is
the only test that calls a model, and it shows the cost first. A model
answers recruiters only when it passes every threshold. Latency is
reported, not gated. The thresholds sit beside the scorer, in
`scripts/evaluation/score.ts`.

## Component previews

Storybook is where the UI is built and checked before it meets the app.
Every component has a story per state, in light and dark, rendered against
the mocks, so a view can be seen without a model or an index. The
accessibility addon runs on every story, and the previews serve the sample
CVs, so a source link opens a real PDF. The screenshot above comes from
there.

```bash
npm run storybook
```

It opens on port 6006. `npm run build-storybook` writes a static copy.

## Repository

```
docs/PRD.md          what we build and why
DESIGN.md            the design system: tokens and visual rules
AGENTS.md            engineering conventions and the full command list
src/app/             routes: the screen, the ask API, the CV file API
src/components/      UI, with its own README on how components are built
src/hooks/           React glue, each hook with its own logic beside it
src/contracts/       the Zod schemas shared by the client, the server and the scripts
src/lib/             the domain: screening, candidates, conversation, models, search
src/mocks/           test doubles and the sample index
scripts/             the pipelines, with their own README: generation, ingestion, evaluation, design lint
data/                the pool: generation seeds, the index, the CVs, and the evaluation reports once npm run eval has run
```

## Running it

```bash
nvm use
npm ci
cp .env.example .env.local   # then fill in the keys
npm run dev
```

Two services are needed. The Gemini API answers the questions and makes
the embeddings. Pinecone holds the vectors. `.env.local` takes the Gemini
key, the Pinecone key and index name, and the names of the three models the
app calls; `.env.example` sets the ones the pilot ran on. Without them no
question is answered. The index and the CVs are in the repository. The
vectors are not: `npm run index -- --step vectors` writes them, and creates
the Pinecone index when it does not exist yet.

## Contributing

`AGENTS.md` is the contributing guide: the conventions, the full command
list and the boundaries every change follows. Before a pull request, run
`npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Each
pipeline has a `--dry-run` flag. It prints what a run would do, without
calling a model. Any run that does call a model shows its cost first.

## Where to read next

`docs/PRD.md` for the product and its open questions.
