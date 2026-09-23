import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuestionBubble } from "./QuestionBubble";

const meta = {
  title: "Chat / ChatExchange / QuestionBubble",
  component: QuestionBubble,
  decorators: [
    (Story) => (
      <div className="flex max-w-reading flex-col">
        <Story />
      </div>
    ),
  ],
  args: { children: "Who has React and TypeScript?" },
} satisfies Meta<typeof QuestionBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneLine: Story = {};
export const OneCharacter: Story = { args: { children: "e" } };
export const Wrapping: Story = {
  args: {
    children:
      "Which candidates have led a frontend team, know React and TypeScript well, and are open to relocating to Berlin within the next three months?",
  },
};
