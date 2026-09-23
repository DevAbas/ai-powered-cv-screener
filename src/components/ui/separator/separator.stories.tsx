import type { Meta } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

export default {
  title: "Components / Separator",
} satisfies Meta;

export const Basic = () => (
  <div className="flex flex-col gap-3 text-body-md leading-body-md text-on-surface">
    <span>Above</span>
    <Separator />
    <span>Below</span>
  </div>
);

export const Vertical = () => (
  <div className="flex h-6 items-center gap-3 text-body-md leading-body-md text-on-surface">
    <span>Pool</span>
    <Separator orientation="vertical" />
    <span>30 CVs</span>
  </div>
);
