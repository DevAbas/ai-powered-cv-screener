import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { cvSourceHref } from "@/lib/pool/source-href";
import { CvSourceLink } from "./CvSourceLink";

const meta = {
  title: "Chat / Answer / CvSourceLink",
  component: CvSourceLink,
  args: { candidateId: "lena-novak", name: "Lena Novak", page: 2 },
} satisfies Meta<typeof CvSourceLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Without a PDF, the card says so and does not open anything. */
export const WithoutPdf: Story = {};

/** With a PDF, the card opens the CV at the cited page in a new tab; hover reads "Open file". */
export const WithPdf: Story = {
  args: { sourceHref: cvSourceHref },
};
