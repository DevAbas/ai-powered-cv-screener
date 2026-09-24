import type { Meta } from "@storybook/nextjs-vite";
import { PdfIcon } from "./PdfIcon";

export default {
  title: "UI / Icons / PdfIcon",
} satisfies Meta;

export const Basic = () => <PdfIcon aria-hidden className="text-on-surface" />;

export const Sizes = () => (
  <div className="flex items-end gap-4 text-on-surface">
    <PdfIcon aria-hidden className="size-4" />
    <PdfIcon aria-hidden className="size-6" />
    <PdfIcon aria-hidden className="size-10" />
  </div>
);
