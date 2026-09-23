import type { Meta } from "@storybook/nextjs-vite";
import { Link } from "./link";

export default {
  title: "Components / Link",
} satisfies Meta;

export const Basic = () => <Link>Lena Novak · p. 2</Link>;

export const WithinText = () => (
  <p className="text-body-md leading-body-md text-on-surface">
    The fact comes from <Link>Lena Novak&apos;s CV</Link>, page 1.
  </p>
);
