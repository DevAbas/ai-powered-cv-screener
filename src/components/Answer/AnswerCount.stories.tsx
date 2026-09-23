import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { countAnswer } from "@/mocks/answers";
import { AnswerCount } from "./AnswerCount";

const meta = {
  title: "Chat / Answer / AnswerCount",
  component: AnswerCount,
  args: { count: countAnswer.count!, candidates: countAnswer.candidates },
} satisfies Meta<typeof AnswerCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithList: Story = {};
export const CountOnly: Story = { args: { count: 2, candidates: undefined } };
export const One: Story = { args: { count: 1, candidates: undefined } };
