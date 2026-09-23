import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ANSWERS } from "@/mocks/answers";
import { AnswerList } from "./answer-list";

const meta = {
  title: "Chat/Answer/AnswerList",
  component: AnswerList,
  args: { candidates: ANSWERS.filter.candidates ?? [], onOpenSource: fn() },
} satisfies Meta<typeof AnswerList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {};
export const Ordered: Story = { args: { candidates: ANSWERS.rank.candidates ?? [], ordered: true } };
