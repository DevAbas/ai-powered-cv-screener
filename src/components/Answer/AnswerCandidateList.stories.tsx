import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ANSWERS } from "@/mocks/answers";
import { AnswerCandidateList } from "./AnswerCandidateList";

const meta = {
  title: "Chat / Answer / AnswerCandidateList",
  component: AnswerCandidateList,
  args: { candidates: ANSWERS.filter.candidates ?? [] },
} satisfies Meta<typeof AnswerCandidateList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {};
export const Ordered: Story = { args: { candidates: ANSWERS.rank.candidates ?? [], ordered: true } };
