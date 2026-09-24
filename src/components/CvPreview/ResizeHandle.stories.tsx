import type { Meta } from "@storybook/nextjs-vite";
import { ResizeHandle } from "./ResizeHandle";

export default {
  title: "App / CvPreview / ResizeHandle",
} satisfies Meta;

export const Basic = () => (
  <div className="relative ml-8 h-40 w-64 border-l border-outline bg-surface-container-lowest">
    <ResizeHandle />
  </div>
);
