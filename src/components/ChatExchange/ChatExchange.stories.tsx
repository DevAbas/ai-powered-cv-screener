import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { readingMessage, STAGE_MESSAGES } from "@/lib/ask/stages";
import { storySourceHref } from "@/mocks/story";
import { ANSWERS } from "@/mocks/answers";
import type { MockAnswer } from "@/mocks/answers";
import { ChatExchange } from "./ChatExchange";

const steps = [
  { stage: "search" as const, message: STAGE_MESSAGES.search },
  { stage: "read" as const, message: readingMessage(ANSWERS.filter.checked) },
  { stage: "write" as const, message: STAGE_MESSAGES.write },
];

/** What an exchange shows of a mock answer. */
const shown = ({ text, view, checked }: MockAnswer) => ({ text, view, checked });

const meta = {
  title: "Chat / ChatExchange",
  component: ChatExchange,
  args: {
    question: "Who has React and TypeScript?",
    status: "answered",
    steps,
    ...shown(ANSWERS.filter),
    sourceHref: storySourceHref,
    onRetry: fn(),
  },
} satisfies Meta<typeof ChatExchange>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Searching: Story = { args: { status: "running", steps: steps.slice(0, 2), text: "", view: undefined, checked: undefined } };
export const SearchingSlow: Story = { args: { ...Searching.args, slow: true } };
/** Part-way through the answer: the text as written so far; the view follows once it is complete. */
export const Writing: Story = { args: { status: "running", text: ANSWERS.filter.text.slice(0, 20), checked: undefined } };
/** A list: the model's line, then the candidates with their skill years and CVs. */
export const Answered: Story = {};
export const Ranked: Story = { args: { question: "Top 3 for a Frontend Lead role", ...shown(ANSWERS.rank) } };
export const Comparison: Story = { args: { question: "Compare Andrei and Elena on backend experience", ...shown(ANSWERS.compare) } };
export const Profile: Story = { args: { question: "Summarize Lena Novak's profile", ...shown(ANSWERS.profile) } };
export const OneFact: Story = { args: { question: "Where did Lena work last?", ...shown(ANSWERS.fact) } };
/** The model showed the list without a sentence; the caption carries the count. */
export const ViewOnly: Story = { args: { question: "How many candidates know Python?", ...shown(ANSWERS.count) } };
export const TextOnly: Story = { args: { question: "How can you help me?", ...shown(ANSWERS.help) } };
export const NoMatch: Story = { args: { question: "Who knows Rust?", ...shown(ANSWERS.empty) } };
export const NotEnoughInformation: Story = { args: { question: "What salary does Lena expect?", ...shown(ANSWERS.insufficient) } };
export const OutsideThePool: Story = { args: { question: "What's the weather today?", ...shown(ANSWERS.outOfScope) } };
export const ErrorRetryable: Story = {
  args: { status: "error", text: "", view: undefined, error: { message: "That took too long. Try again.", retryable: true } },
};
export const ErrorFinal: Story = {
  args: { status: "error", text: "", view: undefined, error: { message: "The question could not be sent.", retryable: false } },
};
/** Stopped part-way: the text written so far stays. */
export const Stopped: Story = { args: { status: "stopped", text: ANSWERS.filter.text.slice(0, 20), view: undefined } };
