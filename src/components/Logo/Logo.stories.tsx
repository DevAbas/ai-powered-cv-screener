import type { Meta } from "@storybook/nextjs-vite";
import { Logo } from "./Logo";
import { LogoMark } from "./LogoMark";

export default {
  title: "App / Logo",
} satisfies Meta;

export const Basic = () => <Logo />;

export const Mark = () => <LogoMark />;
