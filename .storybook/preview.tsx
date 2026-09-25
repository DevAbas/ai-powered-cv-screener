import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/nextjs-vite";
import { googleSans, googleSansFlex } from "../src/app/fonts";
import "../src/app/globals.css";

// On <html>, like the root layout, so portalled menus get the font too.
document.documentElement.classList.add(googleSans.variable, googleSansFlex.variable);

// Same mechanism as the app: <html data-theme> overrides the system theme.
const preview: Preview = {
  decorators: [
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    // Stories are examples, not playgrounds.
    controls: { disable: true },
    actions: { disable: true },
    options: {
      storySort: { method: "alphabetical", order: ["UI", "Chat", "App"] },
    },
  },
};

export default preview;
