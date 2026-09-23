import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { factAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerFact } from "./answer-fact";

const meta = {
  title: "Chat/Answer/AnswerFact",
  component: AnswerFact,
  args: { fact: factAnswer.fact!, nameOf: mockNameOf, onOpenSource: fn() },
} satisfies Meta<typeof AnswerFact>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
