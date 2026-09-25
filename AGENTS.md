<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI-Powered CV Screener — project rules

## Source of truth

- `docs/PRD.md` — what we build and why.
- `README.md` — how it is built: the architecture and the decisions
  behind it.
- `DESIGN.md` — design system: visual tokens and rules.

Each fact lives in exactly one document; others reference it by file and
heading, never repeat it. PRD owns what and why, the README owns how it is
built and why that way, DESIGN.md owns visual rules and token values, code
owns every other exact value, beside the rule that reads it. Before adding
content to a document, check whether another one already owns it.

If a request conflicts with the PRD, update the PRD first, then the code.
Work only on what the PRD asks for; do not add features outside it.

## Before implementing with any library

Read the official documentation for the exact installed version (check
`package.json` and `node_modules`) and confirm the API you need exists in
that version. Do not rely on memory of older versions.

- Next.js: `node_modules/next/dist/docs/`.
- Everything else: fetch the official docs for the installed version.

If the documented API differs from what the code or the README assumes,
stop and report before coding.

## Commands

Run `nvm use` first, in every shell: the Node version comes from `.nvmrc`
(npm, `next build` and installs behave differently under other versions).

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) |
| `npm run generate` | Generate the pool into `data/generation` (seeds, photos, manifest) and `data/cvs` (PDFs): `--step seeds,photos,pdfs` (default seeds and pdfs; `photos` calls Cloudflare Workers AI, free within its daily allowance, and runs only when named), `--only <id,…>`, `--force`, `--dry-run`; skips what exists (makes API calls) |
| `npm run index` | Index `data/cvs/*.pdf` into `data/index/<id>.json` (text per section and page, one extracted profile with the page and section of every field) and one vector per section chunk into Pinecone: `--step profiles,sources,vectors` (default profiles and vectors; `sources` rebuilds chunks and sources without a model; vectors need `PINECONE_API_KEY`), `--only <id,…>`, `--force`, `--dry-run`, `--check` (extraction accuracy against the seeds); skips files that exist (makes API calls) |
| `npm run eval` | Run the golden questions through the answer pipeline per model and score them against the thresholds in `scripts/evaluation/score.ts` into `data/eval/`: `--model <name,…>` (default the model `ANSWER_MODEL` names), `--only <q01,…>`, `--repeat <n>`, `--dry-run` (the estimate, its cost and the remaining credits: one price lookup, no model call). Every run is estimated and approved first (makes API calls) |
| `npm run design:lint` | Lint `DESIGN.md` in light and dark (dark values from `src/styles/theme.css`) |
| `npm run design:export` | Regenerate `src/styles/tokens.generated.css` from `DESIGN.md` |
| `npm run storybook` | Component previews on port 6006 |
| `npm run build-storybook` | Static build of the component previews |

Add each new script here when its phase is implemented and verified, not
before.

## Conventions

- TypeScript strict; no `any`.
- Tests live in a `__tests__` folder inside the folder of the code they
  test, each named after the file it tests (`seedRules.test.ts`). A folder
  with a single tested file keeps the test beside it (`panelWidth.test.ts`).
- Module files (not components, not hooks) are camelCase domain noun
  phrases, unique in the codebase and understood without their folder:
  `candidateProfile.ts`, `answerLoop.ts`, `cvChunks.ts`, `modelRegistry.ts`.
  A bare noun that could appear in any codebase (`log`, `client`, `loop`,
  `pool`) takes the domain word that makes it one thing; a name that
  already names one thing (`indexEntry`, `leadSentence`, `circuitBreaker`)
  stays bare; the folder's word is never repeated for its own sake. Nouns,
  not verbs: exports carry the verbs (`normalizeProfile`, `runLoop`). A
  tool file is named after the tool the model calls
  (`tools/findCandidates.ts`). `Store` for storage adapters, `Schema` for
  Zod schemas, `dependencies` for a dependency bundle. Each module has an
  `index.ts` that lists its names explicitly (never `export *`: the scripts
  run as ES modules); a file that is server-only, reads the file system or
  builds an SDK client stays out of the index and is imported by its path
  (`@/lib/candidates/candidatePool`, `@/lib/models/modelProviders`).
- `src/lib` holds the shared, framework-free modules, one folder per
  concern, named in the domain's own words: `screening` (the core domain:
  answering the recruiter's question, with its `tools/`), `candidates` (the
  pool and each candidate's verified profile), `conversation` (what the
  recruiter asks and is shown), `models` (the language models and how they
  are called), `search` (finding CV text by meaning and keyword). A module
  with a single consumer lives in that consumer's folder as its own file
  (`useResizablePanel/panelWidth.ts`,
  `ThoughtLine/elapsedTime.ts`); only what two or more consumers share is in
  `src/lib`. Test doubles live in `src/mocks`. No `utils` or `constants`
  folders: a constant sits beside the rule that reads it.
- Zod schemas in `src/contracts` (`contract.<area>.ts`, imported from
  `@/contracts`) are the single source of truth. Every tool call and
  presentation call is validated against them before use; the answer text
  is free.
- UI code follows `src/components/README.md`; visual rules are
  `DESIGN.md`'s. Neither is repeated here.
- Routes live in a route group per feature (`src/app/(screener)/`);
  application code stays outside `app`.
- `src/hooks`: one concern each, `src/hooks/use<Name>/` with `use<Name>.ts`
  and `index.ts`. The pure logic a hook binds to React is its own file with
  its unit tests, in the hook's folder when only that hook uses it
  (`useChatScreen/chatState.ts`), in `src/lib` when shared.
- Each pipeline under `scripts/` is an ES module package (its own
  `package.json`; why, in `scripts/README.md`); a CommonJS import from
  there uses the default export of a CJS package (`nextEnv.loadEnvConfig`).

## Git

- Commit at the end of each phase, message format `type: subject`.
- Before every commit, show the proposed message and wait for approval.
  Push only when told to.
- Never add attribution of any kind: no `Co-Authored-By`, no
  "Generated with", no mention of Claude, AI or agents in messages or
  trailers.

## Boundaries

**Always**
- Run lint and typecheck before committing.
- Read `DESIGN.md` before touching UI.

**Ask first**
- Adding a dependency.
- Changing a contract.
- Changing `docs/PRD.md`, `DESIGN.md`, or the README's Architecture and
  Decisions sections.
- Implementing an API that the docs for the installed version do not
  confirm.
- Before any run that calls a model, state the number of calls, the
  estimated cost or quota use and the remaining credits, and wait for
  approval. Chat questions are
  run by the user: give them the questions.
- Dropping code that looks redundant or like a workaround: list it and
  ask.

**Never**
- Commit `.env` files or API keys.
- Edit `src/styles/tokens.generated.css`; change `DESIGN.md` and re-export.
- Import `data/generation` from app code (a lint rule enforces it).
- Import `src/components`, `src/hooks`, `src/app` or `scripts` from
  `src/lib`: dependencies flow app and scripts → lib → contracts.
- Route intents with regexes, keep hand-made stopword or alias lists,
  match words inside other words, guess a name by its position or
  capitalisation, or tune a threshold by eye. Every parameter starts from
  a documented value, cited next to it, and changes only when the
  evaluation shows it helps.
