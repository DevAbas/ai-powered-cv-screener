import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ChatComposer } from "./ChatComposer";
import type { ChatComposerProps } from "./ChatComposer";

function Demo(props: ChatComposerProps) {
  const [value, setValue] = useState(props.value);
  return (
    <div className="max-w-reading pt-24">
      <ChatComposer {...props} value={value} onChange={setValue} />
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
  },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { value: "Who has React and TypeScript?" } };
export const Focus: Story = { play: async ({ userEvent }) => userEvent.tab() };
export const Running: Story = { args: { value: "Who has React and TypeScript?", running: true } };
