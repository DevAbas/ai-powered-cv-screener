import type { Meta } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { storySourceHref } from "@/mocks/story";
import { CvPreview } from "./CvPreview";

export default {
  title: "App / CvPreview",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

const href = storySourceHref("lena-novak", 1)?.split("#")[0] ?? "";

/** The panel docked to the right; drag its left edge to resize. */
export const Basic = () => (
  <div className="h-dvh bg-surface">
    <CvPreview candidateId="lena-novak" name="Lena Novak" page={1} href={href} onClose={fn()} />
  </div>
);
