import type { Meta } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/Button";
import { StatusMessage } from "./StatusMessage";

export default {
  title: "UI / StatusMessage",
} satisfies Meta;

export const Basic = () => <StatusMessage>No candidate in the pool knows Rust.</StatusMessage>;

export const Statuses = () => (
  <div className="flex flex-col gap-4">
    <StatusMessage status="empty">No candidate in the pool knows Rust.</StatusMessage>
    <StatusMessage status="insufficient">The CVs do not say whether Lena can relocate.</StatusMessage>
    <StatusMessage status="out-of-scope">I can only answer questions about the CVs in the pool.</StatusMessage>
    <StatusMessage status="error">The answer could not be loaded.</StatusMessage>
  </div>
);

export const WithAction = () => (
  <StatusMessage status="error" action={<Button size="sm">Retry</Button>}>
    The model did not respond in time.
  </StatusMessage>
);
