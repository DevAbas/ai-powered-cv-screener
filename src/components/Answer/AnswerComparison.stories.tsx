import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { compareAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerComparison } from "./AnswerComparison";

const meta = {
  title: "Chat / Answer / AnswerComparison",
  component: AnswerComparison,
  args: { comparison: compareAnswer.comparison!, nameOf: mockNameOf },
} satisfies Meta<typeof AnswerComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
