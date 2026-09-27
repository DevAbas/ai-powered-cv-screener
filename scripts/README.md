# Scripts

One folder per pipeline, named as the architecture names it. `cli.ts` is
where a pipeline starts; `steps/` holds its steps in order; tests live in a
`__tests__` folder inside the folder of the code they test. Flags and data
paths are documented once, in `AGENTS.md` (Commands).

## generation/

`npm run generate`. Produces the pilot pool for the fixed roster: seeds from
a model, photos from the image slot on Cloudflare Workers AI, reproducible
from a seed per candidate, and one PDF per seed rendered from
`cv-template/`. Has its own `package.json` (`"type": "module"`) because
`@react-pdf/renderer` ships ESM only, and a CommonJS import of an ESM-only
package has no named exports.

## ingestion/

`npm run index`. Reads every PDF in `data/cvs` into an index entry (text per
section and page, one extracted profile with the source of every field) and
stores one vector per section chunk in Pinecone. Has its own `package.json`
(`"type": "module"`) because `pdfjs-dist` ships ESM only.

## evaluation/

`npm run eval`. Runs the golden questions through the answer pipeline per
model and scores them against the thresholds in `score.ts` into
`data/eval/`. Has its own `package.json` (`"type": "module"`) because it
imports the generation package's ESM modules (the seeds step, the seed
rules, the step options), so its files must be ESM as well.

The report says whether each model passes. `--model <name>` runs a
candidate without touching the environment; swapping the model is then a
change of `ANSWER_MODEL` in `.env.local`.

## Data

Each folder of `data/` has one owner:

| Path | Holds | Read by |
|---|---|---|
| `data/generation/seeds/<id>.json` | The ground truth each CV was rendered from | The scripts and the evaluation |
| `data/generation/manifest.json` | The generator's state: whether each PDF carries a photo | The generator |
| `data/generation/photos/<id>.jpg` | Generated photos | The generator |
| `data/index/<id>.json` | One index entry per CV (`IndexEntrySchema`) | The app, once per process, on the first request that needs it |
| `data/cvs/<id>.pdf` | The CVs | The CV route and the component previews |
| `data/eval/` | Evaluation reports | Nobody at run time |

## design-tokens/

`npm run design:export`. The design tokens in `design-system/tokens/` (W3C Design Tokens,
DTCG 2025.10) are the source of every value; `DESIGN.md` is the source of
the rules and holds none. `tokenSource.ts` reads the tokens through
`design-system/tokens/design.resolver.json` with `@terrazzo/parser` (which checks the
format and resolves each theme) and checks the tiers DTCG leaves to a team:
the palette holds values only, a colour role points to the palette or is
derived by the rule on its token, both themes define the same roles.
`derivedColors.ts` applies a derived role's rule with lightningcss.
`designDocument.ts` checks `DESIGN.md`'s `imports:` and components contract
against the tokens and composes, in memory only, the document
`@google/design.md`'s linter reads. The CLI then runs Terrazzo
(`terrazzo.config.ts`), which builds `src/styles/tokens.generated.css` and,
from `src/styles/theme.template.css`, `theme.generated.css`; `--check`
compares both with a fresh build. No `package.json`: `cli.mts` is ESM by its
extension.

## design-lint/

`npm run design:lint`. Checks the tokens' tiers and `DESIGN.md`'s
components contract, then runs the `@google/design.md` linter on the
document `designDocument.ts` composes with each theme's values, for
references and contrast. Only the findings the design system means (a
palette entry no component reads directly) are let through. No
`package.json`: `cli.mts` is ESM by its extension and `core.ts` has no
dependencies.

The same folder holds the design rules for the code: `plugin.mjs` is an
ESLint plugin, one rule per file in `rules/`, that `eslint.config.mjs`
applies to `src` and `.storybook` as warnings (`npm run lint`) or errors
(`npm run lint:strict`, the hooks, CI). `designTokens.mjs` reads the token
names from `src/styles/theme.generated.css` and the components contract
from `DESIGN.md`, so the rules accept exactly what the tokens define. The
plugin and the rules are plain `.mjs` because ESLint loads its config
without a TypeScript loader; their tests, in TypeScript, run ESLint's
`RuleTester` under Vitest. What each rule checks is in
`src/components/README.md`.
