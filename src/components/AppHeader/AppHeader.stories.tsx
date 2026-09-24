import type { Meta } from "@storybook/nextjs-vite";
import { AppHeader } from "./AppHeader";

export default {
  title: "App / AppHeader",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export const Default = () => <AppHeader />;
