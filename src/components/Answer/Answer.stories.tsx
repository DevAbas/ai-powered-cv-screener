import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ANSWERS } from "@/mocks/answers";
import { mockNameOf } from "@/mocks/story";
import { Answer } from "./Answer";

const meta = {
  title: "Chat / Answer",
  component: Answer,
  args: { answer: ANSWERS.filter, nameOf: mockNameOf },
} satisfies Meta<typeof Answer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filter: Story = {};
export const FollowUp: Story = { args: { answer: ANSWERS.followUp } };
export const Rank: Story = { args: { answer: ANSWERS.rank } };
export const Compare: Story = { args: { answer: ANSWERS.compare } };
export const Fact: Story = { args: { answer: ANSWERS.fact } };
export const Profile: Story = { args: { answer: ANSWERS.profile } };
export const Count: Story = { args: { answer: ANSWERS.count } };
export const CountOnly: Story = { args: { answer: ANSWERS.countOnly } };
export const Empty: Story = { args: { answer: ANSWERS.empty } };
export const Insufficient: Story = { args: { answer: ANSWERS.insufficient } };
export const OutOfScope: Story = { args: { answer: ANSWERS.outOfScope } };

/** Sources as links, once the PDFs exist. */
export const WithSourceLinks: Story = {
  args: { sourceHref: (id, page) => `/cvs/${id}.pdf#page=${page}` },
};
