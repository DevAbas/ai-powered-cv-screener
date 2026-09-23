import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { profileAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerProfile } from "./answer-profile";

const meta = {
  title: "Chat/Answer/AnswerProfile",
  component: AnswerProfile,
  args: { profile: profileAnswer.profile!, nameOf: mockNameOf, onOpenSource: fn() },
} satisfies Meta<typeof AnswerProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
