import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PROGRESS_STAGES } from "@/contracts/ask";
import { STAGE_MESSAGES } from "@/lib/ask/stages";
import { AnswerProgress } from "./AnswerProgress";

const all = PROGRESS_STAGES.map((stage) => ({ stage, message: STAGE_MESSAGES[stage] }));

const meta = {
  title: "Chat / ChatExchange / AnswerProgress",
  component: AnswerProgress,
  args: { steps: all.slice(0, 1), checked: 8 },
} satisfies Meta<typeof AnswerProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStage: Story = {};
export const LastStage: Story = { args: { steps: all } };
export const TakingLonger: Story = { args: { steps: all, slow: true } };
export const Settled: Story = { args: { steps: all, working: false } };
export const SettledStopped: Story = { args: { steps: all.slice(0, 2), working: false, outcome: "stopped" } };
export const SettledFailed: Story = { args: { steps: all.slice(0, 2), working: false, outcome: "failed" } };
