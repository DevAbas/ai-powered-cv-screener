import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { SourceLink } from "./source-link";

const meta = {
  title: "Chat/Answer/SourceLink",
  component: SourceLink,
  args: { candidateId: "lena-novak", name: "Lena Novak", page: 2, onOpen: fn() },
} satisfies Meta<typeof SourceLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getByRole("button")),
};
export const Focus: Story = { play: async ({ userEvent }) => userEvent.tab() };
