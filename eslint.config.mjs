// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { designPlugin, isStrictLint } from "./scripts/design-lint/plugin.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
  ...storybook.configs["flat/recommended"],
  // App code never reads the generation data (AGENTS.md, Boundaries).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/data/generation", "**/data/generation/**"], message: "App code never reads data/generation (AGENTS.md, Boundaries)." }] },
      ],
    },
  },
  // The design rules (scripts/design-lint/plugin.mjs): warnings for a person,
  // errors for an agent and CI (`npm run lint:strict`, or CI=true).
  {
    files: ["src/**/*.{ts,tsx}", ".storybook/**/*.tsx"],
    ...(isStrictLint() ? designPlugin.configs.strict : designPlugin.configs.recommended),
  },
]);

export default eslintConfig;
