import type { Meta } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { StateLine } from "./state-line";

export default {
  title: "Components / StateLine",
} satisfies Meta;

export const Basic = () => <StateLine>No candidate in the pool knows Rust.</StateLine>;

export const Statuses = () => (
  <div className="flex flex-col gap-4">
    <StateLine status="empty">No candidate in the pool knows Rust.</StateLine>
    <StateLine status="insufficient">The CVs do not say whether Lena can relocate.</StateLine>
    <StateLine status="out-of-scope">I can only answer questions about the CVs in the pool.</StateLine>
    <StateLine status="error">The answer could not be loaded.</StateLine>
  </div>
);

export const WithAction = () => (
  <StateLine status="error" action={<Button size="sm">Retry</Button>}>
    The model did not respond in time.
  </StateLine>
);
