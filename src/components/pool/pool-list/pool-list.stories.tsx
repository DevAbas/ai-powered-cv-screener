import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MOCK_POOL } from "@/mocks/pool";
import { PoolList } from "./pool-list";

const meta = {
  title: "Pool/PoolList",
  component: PoolList,
  args: { candidates: MOCK_POOL, viewedIds: new Set<string>(), onSelect: fn() },
} satisfies Meta<typeof PoolList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SelectedAndViewed: Story = {
  args: { selectedId: "ali-hasanov", viewedIds: new Set(["lena-novak", "ali-hasanov", "jane-doe"]) },
};
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => userEvent.hover(canvas.getAllByRole("button")[0]),
};
