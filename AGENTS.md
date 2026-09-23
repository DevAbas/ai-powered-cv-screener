<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI-Powered CV Screener — project rules

## Source of truth

- `docs/PRD.md` — what we build and why.
- `docs/PLAN.md` — how, and in which phases.
- `DESIGN.md` — design system: visual tokens and rules.
- `docs/COMPONENTS.md` — product components and their states.

If a request conflicts with the PRD, update the PRD first, then the code.
Work only on the phases in `docs/PLAN.md`; do not add features outside it.

## Before implementing with any library

Read the official documentation for the exact installed version (check
`package.json` and `node_modules`) and confirm the API you need exists in
that version. Do not rely on memory of older versions.

- Next.js: `node_modules/next/dist/docs/`.
- Everything else: fetch the official docs for the installed version.

If the documented API differs from what `docs/PLAN.md` assumes, stop and
report before coding.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

Add each new script here when its phase is implemented and verified, not
before.

## Conventions

- TypeScript strict; no `any`.
- Zod schemas in `src/contracts` are the single source of truth. Every
  LLM output is validated against them before use.
- App components use only M3 token utilities (`bg-surface`,
  `text-on-surface-variant`, …).
- Values described only in `DESIGN.md` prose, and dark values, live in
  `src/styles/theme.css`; change them in the same commit as `DESIGN.md`.
- Interactive primitives only from `@headlessui/react`; state styling via
  its `data-*` attributes.
- No hardcoded colors or sizes.
- Icons: `lucide-react` only.

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
- Changing `docs/PRD.md`, `docs/PLAN.md` or `DESIGN.md`.
- Implementing an API that the docs for the installed version do not
  confirm.

**Never**
- Commit `.env` files or API keys.
- Edit `src/styles/tokens.generated.css`; change `DESIGN.md` and re-export.
- Read `data/seeds` from app code.
- Use default Tailwind palette classes.
