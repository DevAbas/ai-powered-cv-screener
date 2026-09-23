import type { Meta } from "@storybook/nextjs-vite";
import { VendorLogo } from "./VendorLogo";

export default {
  title: "UI / VendorLogo",
} satisfies Meta;

/** Placeholders until the official vendor SVGs replace the files. */
export const Vendors = () => (
  <div className="flex items-center gap-3">
    <VendorLogo vendor="nvidia" />
    <VendorLogo vendor="google" />
  </div>
);
