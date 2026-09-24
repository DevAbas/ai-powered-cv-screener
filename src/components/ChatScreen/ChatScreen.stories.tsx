import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MOCK_POOL } from "@/mocks/pool";
import { SUGGESTED_QUESTIONS } from "@/lib/chat/suggestions";
import { ChatScreen } from "./ChatScreen";

const meta = {
  title: "Chat / ChatScreen",
  component: ChatScreen,
  parameters: { layout: "fullscreen" },
  args: { pool: MOCK_POOL, suggestions: SUGGESTED_QUESTIONS },
} satisfies Meta<typeof ChatScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole flow against the mocks: ask a suggestion, open a source, follow up. */
export const Default: Story = {};
