import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AnswerView } from "@/contracts/view";
import { storySourceHref } from "@/mocks/story";
import { ANDREI } from "@/lib/retrieval/fixtures";
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

/** With leadership and a certification, each in its own section. */
export const Basic: Story = {};
/** Without them, those sections are left out. */
export const Short: Story = {
  args: { view: { kind: "profile", candidate: { candidateId: ANDREI.id, profile: ANDREI.profile, skills: [], page: 1 } } },
};
