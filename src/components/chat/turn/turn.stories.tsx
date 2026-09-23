import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ANSWERS } from "@/mocks/answers";
import { STAGE_MESSAGES } from "@/mocks/scenarios";
import { mockNameOf } from "@/mocks/story";
import { Turn } from "./turn";

const steps = (["filter", "evidence", "compose"] as const).map((stage) => ({ stage, message: STAGE_MESSAGES[stage] }));

const meta = {
  title: "Chat/Turn",
  component: Turn,
  args: {
    question: "Who has React and TypeScript?",
    status: "answered",
    steps,
    answer: ANSWERS.filter,
    nameOf: mockNameOf,
    onOpenSource: fn(),
    onRetry: fn(),
    onCopy: fn(async () => {}),
  },
} satisfies Meta<typeof Turn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { status: "running", steps: steps.slice(0, 2), answer: undefined } };
export const RunningSlow: Story = { args: { ...Running.args, slow: true } };
export const Answered: Story = {};
export const Copied: Story = {
  play: async ({ canvas, userEvent }) => userEvent.click(canvas.getByRole("button", { name: "Copy answer" })),
};
export const ErrorRetryable: Story = {
  args: {
    status: "error",
    answer: undefined,
    error: { message: "The model did not respond in time. Try again.", retryable: true },
  },
};
export const ErrorFinal: Story = {
  args: { status: "error", answer: undefined, error: { message: "The question could not be processed.", retryable: false } },
};
export const Stopped: Story = { args: { status: "stopped", answer: undefined } };
