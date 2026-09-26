// Terrazzo builds the CSS from the W3C Design Tokens that `npm run
// design:export` writes from DESIGN.md (terrazzo.app/docs/integrations/tailwind):
//
// - plugin-css: every token of the light theme as a `:root` variable, which is
//   how the palette reaches the page without making a utility;
// - plugin-tailwind: the Tailwind v4 theme, from src/styles/theme.template.css,
//   whose `@tz` rules receive the light and dark tokens. The mapping below puts
//   each DESIGN.md group in the Tailwind namespace that makes its utilities;
//   the palette is left out, so no class can name a primitive.
//
// DESIGN_TOKENS_OUT_DIR builds elsewhere, for `design:export -- --check`.

import { resolve } from "node:path";
import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";
import tailwind from "@terrazzo/plugin-tailwind";

export default defineConfig({
  tokens: ["./tokens/design.resolver.json"],
  outDir: process.env.DESIGN_TOKENS_OUT_DIR ?? "./src/styles/",
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
