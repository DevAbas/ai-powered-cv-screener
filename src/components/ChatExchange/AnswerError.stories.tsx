import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AnswerError } from "./AnswerError";

const meta = {
  title: "Chat / ChatExchange / AnswerError",
  component: AnswerError,
  args: { message: "The model did not respond in time. Try again.", retryable: true, onRetry: fn() },
} satisfies Meta<typeof AnswerError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Retryable: Story = {};
export const NotRetryable: Story = { args: { message: "The question could not be processed.", retryable: false } };
