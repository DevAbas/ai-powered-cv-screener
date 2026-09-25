import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { AnswerModelId } from "@/contracts";
import { ModelSelect } from "./ModelSelect";
import type { ModelSelectProps } from "./ModelSelect";

function Demo(props: ModelSelectProps) {
  const [value, setValue] = useState<AnswerModelId>(props.value);
  return (
    <div className="pt-24">
      <ModelSelect {...props} value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Chat / ChatComposer / ModelSelect",
  component: ModelSelect,
  render: (args) => <Demo {...args} />,
  args: { value: "primary", onChange: fn() },
} satisfies Meta<typeof ModelSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Alternative: Story = { args: { value: "alternative" } };
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getByRole("button", { name: /^Model/ })),
};
export const Open: Story = {
  play: async ({ canvas, userEvent }) => userEvent.click(canvas.getByRole("button", { name: /^Model/ })),
};
