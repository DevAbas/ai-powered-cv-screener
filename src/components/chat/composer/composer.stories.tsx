import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { AnswerModelId } from "@/contracts/ask";
import { Composer } from "./composer";
import type { ComposerProps } from "./composer";

function Demo(props: ComposerProps) {
  const [value, setValue] = useState(props.value);
  const [model, setModel] = useState<AnswerModelId>(props.model);
  return (
    <div className="max-w-reading pt-24">
      <Composer {...props} value={value} onChange={setValue} model={model} onModelChange={setModel} />
    </div>
  );
}

const meta = {
  title: "Chat/Composer",
  component: Composer,
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
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { value: "Who has React and TypeScript?" } };
export const Focus: Story = { play: async ({ userEvent }) => userEvent.tab() };
export const Running: Story = { args: { value: "Who has React and TypeScript?", running: true } };
export const ModelMenuOpen: Story = {
  play: async ({ canvas, userEvent }) => userEvent.click(canvas.getByRole("button", { name: /^Model/ })),
};
