import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mockAsk } from "@/mocks/ask";
import { MOCK_POOL } from "@/mocks/pool";
import { storySourceHref } from "@/mocks/story";
import { ChatScreen } from "./ChatScreen";

const meta = {
  title: "Chat / ChatScreen",
  component: ChatScreen,
  parameters: { layout: "fullscreen" },
  args: { pool: MOCK_POOL, sourceHref: storySourceHref, transport: mockAsk },
} satisfies Meta<typeof ChatScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole flow against the mock transport: ask an example question, open a source, follow up. */
export const Default: Story = {};
