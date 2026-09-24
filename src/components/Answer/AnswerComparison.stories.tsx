import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { AnswerView } from "@/contracts/view";
import { cvSourceHref } from "@/lib/pool/source-href";
import { ANSWERS } from "@/mocks/answers";
import { AnswerComparison } from "./AnswerComparison";

type ComparisonView = Extract<AnswerView, { kind: "comparison" }>;

const comparison = ANSWERS.compare.view as ComparisonView;

const meta = {
  title: "Chat / Answer / AnswerComparison",
  component: AnswerComparison,
  args: { view: comparison, sourceHref: cvSourceHref },
} satisfies Meta<typeof AnswerComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One skill asked about: its years get their own row. */
export const WithSkill: Story = {};
/** No skill asked about: the standing criteria only. */
export const General: Story = {
  args: { view: { ...comparison, skills: [], candidates: comparison.candidates.map((c) => ({ ...c, skills: [] })) } },
};
