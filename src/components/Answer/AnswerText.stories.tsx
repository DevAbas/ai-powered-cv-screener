import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ANSWERS } from "@/mocks/answers";
import { AnswerText } from "./AnswerText";

/** The Markdown the model may still write beside a view, or on its own. */
const LIST = "Two things stand out:\n\n- **Jane Doe** already leads a frontend team.\n- **Lena Novak** mentors junior developers.";
const NUMBERED = "Worth a call first:\n\n1. **Jane Doe**, for the leadership.\n2. **Daan de Vries**, for the depth.";

const meta = {
  title: "Chat / Answer / AnswerText",
  component: AnswerText,
  args: { text: ANSWERS.help.text },
} satisfies Meta<typeof AnswerText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paragraph: Story = {};
export const List: Story = { args: { text: LIST } };
export const Numbered: Story = { args: { text: NUMBERED } };
export const OneLine: Story = { args: { text: ANSWERS.fact.text } };
/** Mid-stream: the Markdown so far, which may end part-way through a word or a list. */
export const Streaming: Story = { args: { text: LIST.slice(0, 50) } };
