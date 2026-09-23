import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { profileAnswer } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { AnswerProfile } from "./AnswerProfile";

const meta = {
  title: "Chat / Answer / AnswerProfile",
  component: AnswerProfile,
  args: { profile: profileAnswer.profile!, nameOf: mockNameOf },
} satisfies Meta<typeof AnswerProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
