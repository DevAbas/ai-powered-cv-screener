import type { Meta } from "@storybook/nextjs-vite";
import { Input } from "./Input";

export default {
  title: "UI / Input",
} satisfies Meta;

export const Basic = () => <Input aria-label="Question" placeholder="Ask about the candidate pool" />;

export const Variants = () => (
  <div className="flex max-w-reading flex-col gap-4">
    <Input aria-label="Subtle" placeholder="subtle" variant="subtle" />
    <div className="rounded-xl bg-surface-container-lowest p-3">
      <Input aria-label="Plain" placeholder="plain, inside a container that owns the chrome" variant="plain" />
    </div>
  </div>
);

export const WithValue = () => <Input aria-label="Question" defaultValue="Who has React and TypeScript?" />;

export const Disabled = () => <Input aria-label="Question" placeholder="Ask about the candidate pool" disabled />;
