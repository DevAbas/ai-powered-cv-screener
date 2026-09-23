import type { StorybookConfig } from "@storybook/nextjs-vite";

// Stories live next to their component (AGENTS.md, Conventions).
const config: StorybookConfig = {
  stories: ["../src/components/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@storybook/addon-themes"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};

export default config;
