import type { Meta } from "@storybook/nextjs-vite";
import { Link } from "./Link";

export default {
  title: "UI / Link",
} satisfies Meta;

export const Basic = () => <Link href="#cv">Lena Novak · p. 2</Link>;

export const WithinText = () => (
  <p className="text-body-md leading-body-md text-on-surface">
    The fact comes from <Link href="#cv">Lena Novak&apos;s CV</Link>, page 1.
  </p>
);
