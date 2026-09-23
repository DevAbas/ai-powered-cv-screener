import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MOCK_POOL } from "@/mocks/pool";
import { SUGGESTED_QUESTIONS } from "@/mocks/suggestions";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Chat/EmptyState",
  component: EmptyState,
  args: { poolSize: MOCK_POOL.length, suggestions: SUGGESTED_QUESTIONS, onAsk: fn() },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SuggestionHover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getAllByRole("button")[0]),
};
