# Scripts

One folder per pipeline, named as the architecture names it. `cli.ts` is
where a pipeline starts; `steps/` holds its steps in order; tests live in a
`__tests__` folder inside the folder of the code they test. Flags and data
paths are documented once, in `AGENTS.md` (Commands).

## generation/

`npm run generate`. Produces the pilot pool for the fixed roster: seeds from
a model, photos from the paid image entry, and one PDF per seed rendered
from `cv-template/`. Has its own `package.json` (`"type": "module"`) because
`@react-pdf/renderer` ships ESM only, and a CommonJS import of an ESM-only
package has no named exports.

## ingestion/

`npm run index`. Reads every PDF in `data/cvs` into an index entry (text per
section and page, one extracted profile with the source of every field) and
stores one vector per section chunk in Pinecone. Has its own `package.json`
(`"type": "module"`) because `pdfjs-dist` ships ESM only.

## evaluation/

`npm run eval`. Runs the golden questions through the answer pipeline per
model and scores them against the PLAN thresholds into `data/eval/`. Has its
own `package.json` (`"type": "module"`) because it imports the generation
package's ESM modules (the seeds step, the seed rules, the step options), so
its files must be ESM as well.

## design-lint/

`npm run design:lint`. Lints `DESIGN.md` in light, checks that
`src/styles/theme.css` gives every colour role a dark value, then lints the
document again with the dark values substituted. No `package.json`:
`cli.mts` is ESM by its extension and `core.ts` has no dependencies.
