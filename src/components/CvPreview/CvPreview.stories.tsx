import type { Meta } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { cvSourceHref } from "@/lib/pool/source-href";
import { CvPreview } from "./CvPreview";

export default {
  title: "App / CvPreview",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

const href = cvSourceHref("lena-novak", 1)?.split("#")[0] ?? "";

/** The panel docked to the right; drag its left edge to resize. */
export const Basic = () => (
  <div className="h-dvh bg-surface">
    <CvPreview candidateId="lena-novak" name="Lena Novak" page={1} href={href} onClose={fn()} />
  </div>
);
