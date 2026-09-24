import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { STAGE_MESSAGES, toolMessage } from "@/lib/ask/stages";
import { AnswerProgress } from "./AnswerProgress";

const all = [
  { stage: "understand", message: STAGE_MESSAGES.understand },
  { stage: "search", message: toolMessage("find_candidates") },
  { stage: "write", message: STAGE_MESSAGES.write },
];

const meta = {
  title: "Chat / ChatExchange / AnswerProgress",
  component: AnswerProgress,
  args: { steps: all.slice(0, 1), matched: { kind: "matched", count: 7, total: 30 } },
} satisfies Meta<typeof AnswerProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStage: Story = {};
export const LastStage: Story = { args: { steps: all } };
export const TakingLonger: Story = { args: { steps: all, slow: true } };
/** "Matched 7 of 30 CVs": a filter or a count ran. */
export const Settled: Story = { args: { steps: all, working: false } };
/** "Read 2 CVs": candidates were read in full. */
export const SettledRead: Story = { args: { steps: all, working: false, matched: { kind: "read", count: 2, total: 2 } } };
/** "Answered": no CV was searched. */
export const SettledAnswered: Story = { args: { steps: all.slice(0, 1), working: false, matched: null } };
/** The fallback model answered, and the line says which. */
export const SettledFallback: Story = { args: { steps: all, working: false, answeredBy: { model: "primary", name: "Qwen3.8 27B", fellBack: true } } };
export const SettledStopped: Story = { args: { steps: all.slice(0, 2), working: false, outcome: "stopped" } };
export const SettledFailed: Story = { args: { steps: all.slice(0, 2), working: false, outcome: "failed" } };
