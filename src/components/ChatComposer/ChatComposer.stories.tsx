import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { AnswerModelId } from "@/contracts/ask";
import { getEntry } from "@/lib/ai/registry";
import { ChatComposer } from "./ChatComposer";
import type { ChatComposerProps } from "./ChatComposer";

function Demo(props: ChatComposerProps) {
  const [value, setValue] = useState(props.value);
  const [model, setModel] = useState<AnswerModelId>(props.model);
  return (
    <div className="max-w-reading pt-24">
      <ChatComposer {...props} value={value} onChange={setValue} model={model} onModelChange={setModel} />
    </div>
  );
}

const meta = {
  title: "Chat / ChatComposer",
  component: ChatComposer,
  render: (args) => <Demo {...args} />,
  args: {
    value: "",
    onChange: fn(),
    onSubmit: fn(),
    running: false,
    onStop: fn(),
    model: "primary",
    onModelChange: fn(),
  },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** This phase offers one model: no chip. */
export const Empty: Story = {};
export const Filled: Story = { args: { value: "Who has React and TypeScript?" } };
export const Focus: Story = { play: async ({ userEvent }) => userEvent.tab() };
export const Running: Story = { args: { value: "Who has React and TypeScript?", running: true } };
/** With a choice, the chip and its menu (the disabled alternative shown as if offered). */
export const ModelMenuOpen: Story = {
  args: { models: [getEntry("primary"), { ...getEntry("alternative"), enabled: true }] },
  play: async ({ canvas, userEvent }) => userEvent.click(canvas.getByRole("button", { name: /^Model/ })),
};
