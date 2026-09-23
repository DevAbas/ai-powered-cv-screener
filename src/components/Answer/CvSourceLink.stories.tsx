import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CvSourceLink } from "./CvSourceLink";

const meta = {
  title: "Chat / Answer / CvSourceLink",
  component: CvSourceLink,
  args: { candidateId: "lena-novak", name: "Lena Novak", page: 2 },
} satisfies Meta<typeof CvSourceLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Until the PDFs exist, a source is text. */
export const WithoutPdf: Story = {};

/** With a PDF, it opens the CV at the cited page in a new tab. */
export const WithPdf: Story = {
  args: { sourceHref: (id, page) => `/cvs/${id}.pdf#page=${page}` },
};
