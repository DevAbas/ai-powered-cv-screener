// Terrazzo builds the CSS from the W3C Design Tokens in design-system/tokens/, read through
// design-system/tokens/design.resolver.json (terrazzo.app/docs/integrations/tailwind):
//
// - plugin-css: every token of the light theme as a `:root` variable, which is
//   how the palette reaches the page without making a utility;
// - plugin-tailwind: the Tailwind v4 theme, from src/styles/theme.template.css,
//   whose `@tz` rules receive the light and dark tokens. The mapping below puts
//   each DESIGN.md group in the Tailwind namespace that makes its utilities;
//   the palette is left out, so no class can name a primitive.
//
// DESIGN_TOKENS_OUT_DIR builds elsewhere, for `design:export -- --check`.
//
// The lint runs with every build, so `design:export` (and its --check) fails
// on it. Setting `lint.rules` replaces Terrazzo's recommended set, so it is
// spread first (@terrazzo/parser RECOMMENDED_CONFIG, 2.7.1), then:
//
// - core/consistent-naming: an error, not the recommended warning, which
//   `tz build --silent` would hide: every id segment is kebab-case, the case
//   the classes and CSS variables take (DESIGN.md, Overview: Reading the tokens);
// - core/descriptions: every colour role carries its definition as
//   `$description` (AGENTS.md, Source of truth). The other groups are ignored,
//   by name, so a new group is held to it until it is listed here.

import { resolve } from "node:path";
import { defineConfig } from "@terrazzo/cli";
import { RECOMMENDED_CONFIG } from "@terrazzo/parser";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";

export default defineConfig({
  tokens: ["./design-system/tokens/design.resolver.json"],
  outDir: process.env.DESIGN_TOKENS_OUT_DIR ?? "./src/styles/",
  lint: {
    rules: {
      ...RECOMMENDED_CONFIG,
      "core/consistent-naming": ["error", { format: "kebab-case" }],
      "core/descriptions": ["error", { ignore: ["palette.**", "font.**", "typography.**", "spacing.**", "rounded.**", "shadow.**", "motion.**", "breakpoints.**", "containers.**"] }],
    },
  },
  plugins: [
    css({
      filename: "tokens.generated.css",
      permutations: [
        { input: { theme: "light" }, prepare: (contents) => `:root {\n${contents}\n}` },
        // Dark reaches the page through the Tailwind theme's `@variant dark`; plugin-tailwind still needs the permutation.
        { input: { theme: "dark" }, prepare: () => "" },
      ],
    }),
    tailwind({
      template: resolve("src/styles/theme.template.css"),
      filename: "theme.generated.css",
      theme: {
        color: ["color.*"],
        text: ["typography.*"],
        radius: ["rounded.*"],
        spacing: ["spacing.*"],
        shadow: ["shadow.*"],
        ease: ["motion.ease-*"],
        breakpoint: ["breakpoints.*"],
        container: ["containers.*"],
      },
    }),
  ],
});
