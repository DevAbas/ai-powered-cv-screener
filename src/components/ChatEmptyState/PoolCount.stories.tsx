import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MOCK_POOL } from "@/mocks/pool";
import { PoolCount } from "./PoolCount";

const meta = {
  title: "Chat / ChatEmptyState / PoolCount",
  component: PoolCount,
  args: { poolSize: MOCK_POOL.length },
} satisfies Meta<typeof PoolCount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {};
/** The singular. */
export const OneCv: Story = { args: { poolSize: 1 } };
