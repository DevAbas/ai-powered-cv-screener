import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { compareAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerCompare } from "./answer-compare";

const meta = {
  title: "Chat/Answer/AnswerCompare",
  component: AnswerCompare,
  args: { comparison: compareAnswer.comparison!, nameOf: mockNameOf, onOpenSource: fn() },
} satisfies Meta<typeof AnswerCompare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
