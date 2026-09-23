import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { AnswerModelId } from "@/contracts/ask";
import { ModelChip } from "./model-chip";
import type { ModelChipProps } from "./model-chip";

function Demo(props: ModelChipProps) {
  const [value, setValue] = useState<AnswerModelId>(props.value);
  return (
    <div className="pt-24">
      <ModelChip {...props} value={value} onChange={setValue} />
    </div>
  );
}

const meta = {
  title: "Chat/Composer/ModelChip",
  component: ModelChip,
  render: (args) => <Demo {...args} />,
  args: { value: "primary", onChange: fn() },
} satisfies Meta<typeof ModelChip>;

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
