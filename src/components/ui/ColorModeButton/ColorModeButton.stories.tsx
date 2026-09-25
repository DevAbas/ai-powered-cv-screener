import type { Meta } from "@storybook/nextjs-vite";
import { ColorModeButton } from "./ColorModeButton";

export default {
  title: "UI / ColorModeButton",
} satisfies Meta;

/** Moon in light mode, Sun in dark mode; clicking switches the preview's theme and plays the switch click. */
export const Basic = () => <ColorModeButton />;
