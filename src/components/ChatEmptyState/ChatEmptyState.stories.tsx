import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MOCK_POOL } from "@/mocks/pool";
import { ChatEmptyState } from "./ChatEmptyState";

const meta = {
  title: "Chat / ChatEmptyState",
  component: ChatEmptyState,
  args: { poolSize: MOCK_POOL.length },
} satisfies Meta<typeof ChatEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Hovering "Candidates" fills its highlight to the whole word. */
export const HighlightHover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getByText("Candidates")),
};
