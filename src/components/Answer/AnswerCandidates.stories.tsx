import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AnswerView } from "@/contracts";
import { storySourceHref } from "@/mocks/story";
import { ANSWERS } from "@/mocks/answers";
import { AnswerCandidates } from "./AnswerCandidates";

type ListView = Extract<AnswerView, { kind: "list" }>;

/** The list view of a mock answer. */
const list = (view: AnswerView | undefined): ListView => {
  if (view?.kind !== "list") throw new Error("Not a list");
  return view;
};

const meta = {
  title: "Chat / Answer / AnswerCandidates",
  component: AnswerCandidates,
  args: { view: list(ANSWERS.filter.view), sourceHref: storySourceHref },
} satisfies Meta<typeof AnswerCandidates>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two skills asked about: the app's sentence, then three rows and "Show all 4". */
export const Skills: Story = {};
/** The model's order, numbered, with its reason for each. */
export const Ranked: Story = { args: { view: list(ANSWERS.rank.view) } };
/** A count with its list: the sentence carries the count. */
export const Count: Story = { args: { view: list(ANSWERS.count.view) } };
/** A count without its list: the sentence alone. */
export const CountOnly: Story = { args: { view: list(ANSWERS.countOnly.view) } };
/** A single fact: one row, no sentence. */
export const OneRow: Story = { args: { view: list(ANSWERS.fact.view) } };
/** Without PDFs, each card says the CV is not available. */
export const WithoutPdfs: Story = { args: { sourceHref: undefined } };
