import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppHeader } from "./AppHeader";

const meta = {
  title: "App / AppHeader",
  component: AppHeader,
  parameters: { layout: "fullscreen" },
  args: { poolSize: 30 },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
