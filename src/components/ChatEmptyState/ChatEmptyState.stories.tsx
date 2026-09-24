import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MOCK_POOL } from "@/mocks/pool";
import { SUGGESTED_QUESTIONS } from "@/lib/chat/suggestions";
import { ChatEmptyState } from "./ChatEmptyState";

const meta = {
  title: "Chat / ChatEmptyState",
  component: ChatEmptyState,
  args: { poolSize: MOCK_POOL.length, suggestions: SUGGESTED_QUESTIONS, onAsk: fn() },
} satisfies Meta<typeof ChatEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SuggestionHover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getAllByRole("button")[0]),
};
