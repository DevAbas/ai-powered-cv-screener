import Image from "next/image";
import type { Vendor } from "@/lib/ai/registry";
import { cx } from "@/theme/define-recipe";

export interface VendorLogoProps {
  /** The model maker; the file is `public/icons/providers/<vendor>.svg`. */
  vendor: Vendor;
  className?: string | undefined;
}

/** The model maker's logo at the 1rem icon size. Decorative: the model name is always shown next to it. */
export function VendorLogo({ vendor, className }: VendorLogoProps) {
  // width/height are the SVG's intrinsic size; `size-4` sets the rendered size.
  return (
    <Image
      src={`/icons/providers/${vendor}.svg`}
      alt=""
      width={16}
      height={16}
      className={cx("size-4 shrink-0", className)}
    />
  );
}
