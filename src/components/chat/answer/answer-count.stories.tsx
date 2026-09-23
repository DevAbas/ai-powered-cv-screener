import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { countAnswer } from "@/mocks/answers";
import { AnswerCount } from "./answer-count";

const meta = {
  title: "Chat/Answer/AnswerCount",
  component: AnswerCount,
  args: { count: countAnswer.count!, candidates: countAnswer.candidates, onOpenSource: fn() },
} satisfies Meta<typeof AnswerCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithList: Story = {};
export const CountOnly: Story = { args: { count: 2, candidates: undefined } };
export const One: Story = { args: { count: 1, candidates: undefined } };
