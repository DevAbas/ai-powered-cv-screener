import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CandidateName } from "./CandidateName";

const meta = {
  title: "Chat / Answer / CandidateName",
  component: CandidateName,
  args: { name: "Lena Novak" },
} satisfies Meta<typeof CandidateName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};
