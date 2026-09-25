import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AnswerView } from "@/contracts/view";
import { storySourceHref } from "@/mocks/story";
import { ANSWERS } from "@/mocks/answers";
import { AnswerProfile } from "./AnswerProfile";

type ProfileView = Extract<AnswerView, { kind: "profile" }>;

const meta = {
  title: "Chat / Answer / AnswerProfile",
  component: AnswerProfile,
  args: { view: ANSWERS.profile.view as ProfileView, sourceHref: storySourceHref },
} satisfies Meta<typeof AnswerProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The name, the CV and one line; the sentences above it come from the answer. */
export const Basic: Story = {};
