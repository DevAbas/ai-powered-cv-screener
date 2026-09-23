import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PROGRESS_STAGES } from "@/contracts/ask";
import { STAGE_MESSAGES } from "@/mocks/scenarios";
import { Progress } from "./progress";

const all = PROGRESS_STAGES.map((stage) => ({ stage, message: STAGE_MESSAGES[stage] }));

const meta = {
  title: "Chat/Turn/Progress",
  component: Progress,
  args: { steps: all.slice(0, 1) },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStage: Story = {};
export const LastStage: Story = { args: { steps: all } };
export const TakingLonger: Story = { args: { steps: all, slow: true } };
