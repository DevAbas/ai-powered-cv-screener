import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatEmptyState } from "./ChatEmptyState";

const meta = {
  title: "Chat / ChatEmptyState",
  component: ChatEmptyState,
} satisfies Meta<typeof ChatEmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The frame on "Candidates" once the words have risen. */
export const Default: Story = {};
/** Hovering a word moves the frame to it and blurs the others. */
export const FocusHover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getByText("Right")),
};
