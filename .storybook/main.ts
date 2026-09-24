import type { StorybookConfig } from "@storybook/nextjs-vite";

// Stories live next to their component (AGENTS.md, Conventions).
const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: "@storybook/nextjs-vite",
  // The CVs live outside `public` (PLAN, Data layout); previews serve them at /cvs/<id>.pdf.
  staticDirs: ["../public", { from: "../data/cvs", to: "/cvs" }],
};

export default config;
