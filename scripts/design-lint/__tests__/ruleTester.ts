import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

// ESLint's RuleTester on Vitest: the cases are the real repository's tokens
// (`loadDesignTokens` reads DESIGN.md from the working directory), so a valid
// class here is one DESIGN.md exports today.

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

export const COMPONENT = "src/components/ui/Probe/Probe.tsx";
export const RECIPE = "src/components/ui/Probe/Probe.recipe.ts";
