import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AnswerView } from "@/contracts/view";
import { cvSourceHref } from "@/lib/pool/source-href";
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
  args: { view: list(ANSWERS.filter.view), sourceHref: cvSourceHref },
} satisfies Meta<typeof AnswerCandidates>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two skills asked about: their years from each CV, most React first. */
export const Skills: Story = {};
/** The model's order, numbered, with its reason for each. */
export const Ranked: Story = { args: { view: list(ANSWERS.rank.view) } };
/** One skill, the notes only where they add something. */
export const Count: Story = { args: { view: list(ANSWERS.count.view) } };
/** A single fact: one row, no caption. */
export const OneRow: Story = { args: { view: list(ANSWERS.fact.view) } };
/** Without PDFs, each card says the CV is not available. */
export const WithoutPdfs: Story = { args: { sourceHref: undefined } };
