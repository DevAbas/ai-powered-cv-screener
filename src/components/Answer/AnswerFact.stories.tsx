import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { factAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerFact } from "./AnswerFact";

const meta = {
  title: "Chat / Answer / AnswerFact",
  component: AnswerFact,
  args: { fact: factAnswer.fact!, nameOf: mockNameOf },
} satisfies Meta<typeof AnswerFact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
