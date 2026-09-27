// The design rules as an ESLint plugin: DESIGN.md's rules that a linter can
// hold the code to, each rule a file in `rules/` with its reasons on top and
// its tests in `__tests__/`. Two configs, as Meta's Astryx ships them:
// `recommended` warns, for a person mid-edit; `strict` errors, for an agent
// and for CI (`npm run lint:strict`), where a warning is easy to ignore
// because the exit code stays zero. The repository was clean when the rules
// arrived, so no rule needs a rollout period at warn.

import { noRawColor } from "./rules/noRawColor.mjs";
import { tokenClasses } from "./rules/tokenClasses.mjs";
import { focusVisibleOnly } from "./rules/focusVisibleOnly.mjs";
import { noHoverOnDisabled } from "./rules/noHoverOnDisabled.mjs";
import { recipeCitesTokens } from "./rules/recipeCitesTokens.mjs";
import { stylesheetColor } from "./rules/stylesheetColor.mjs";

/** The rules for component source (TypeScript and TSX). */
const codeRules = {
  "no-raw-color": noRawColor,
  "token-classes": tokenClasses,
  "focus-visible-only": focusVisibleOnly,
  "no-hover-on-disabled": noHoverOnDisabled,
  "recipe-cites-tokens": recipeCitesTokens,
};

/** The rules for stylesheets, which @eslint/css parses (`language: "css/css"`). */
const stylesheetRules = {
  "stylesheet-color": stylesheetColor,
};

/** Every rule of a set at one severity, under the `design/` prefix. */
const at = (rules, severity) => Object.fromEntries(Object.keys(rules).map((name) => [`design/${name}`, severity]));

/** @type {import("eslint").ESLint.Plugin & { configs: Record<"recommended" | "strict" | "stylesheetRecommended" | "stylesheetStrict", import("eslint").Linter.Config> }} */
export const designPlugin = {
  meta: { name: "design", version: "1.0.0" },
  rules: { ...codeRules, ...stylesheetRules },
  configs: {},
};

designPlugin.configs.recommended = { plugins: { design: designPlugin }, rules: at(codeRules, "warn") };
designPlugin.configs.strict = { plugins: { design: designPlugin }, rules: at(codeRules, "error") };
designPlugin.configs.stylesheetRecommended = { plugins: { design: designPlugin }, rules: at(stylesheetRules, "warn") };
designPlugin.configs.stylesheetStrict = { plugins: { design: designPlugin }, rules: at(stylesheetRules, "error") };

/** True when the lint runs for an agent or CI: the design rules are errors. */
export const isStrictLint = (env = process.env) => env.DESIGN_LINT_STRICT === "1" || env.CI === "true";
