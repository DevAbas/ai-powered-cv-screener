import type { Meta } from "@storybook/nextjs-vite";
import { VendorLogo } from "./VendorLogo";

export default {
  title: "UI / VendorLogo",
} satisfies Meta;

/** Every maker in the registry; nvidia and qwen are placeholder marks until the official SVGs replace the files. */
export const Vendors = () => (
  <div className="flex items-center gap-3">
    <VendorLogo vendor="google" />
    <VendorLogo vendor="nvidia" />
    <VendorLogo vendor="qwen" />
  </div>
);
