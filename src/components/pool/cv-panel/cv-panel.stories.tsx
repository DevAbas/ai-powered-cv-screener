import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MOCK_POOL } from "@/mocks/pool";
import { CvPanel } from "./cv-panel";

const meta = {
  title: "Pool/CvPanel",
  component: CvPanel,
  args: { candidate: MOCK_POOL[0], page: 1, onBack: fn() },
} satisfies Meta<typeof CvPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPage: Story = {};
export const LaterPage: Story = { args: { candidate: MOCK_POOL[1], page: 3 } };
