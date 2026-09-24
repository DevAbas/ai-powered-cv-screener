import Image from "next/image";
import type { Vendor } from "@/lib/ai/registry";
import { vendorLogoRecipe } from "./VendorLogo.recipe";

export interface VendorLogoProps {
  /** The model maker; the file is `public/icons/providers/<vendor>.svg`. */
  vendor: Vendor;
  className?: string | undefined;
}

/** Makers whose logo is a single black mark. */
const MONO_MARKS: ReadonlySet<Vendor> = new Set<Vendor>(["nvidia", "qwen"]);

/** The model maker's logo at the 1rem icon size. Decorative: the model name is always shown next to it. */
export function VendorLogo({ vendor, className }: VendorLogoProps) {
  // width/height are the SVG's intrinsic size; `size-4` sets the rendered size.
  return (
    <Image
      src={`/icons/providers/${vendor}.svg`}
      alt=""
      width={16}
      height={16}
      className={vendorLogoRecipe({ mark: MONO_MARKS.has(vendor) ? "mono" : "color", className })}
    />
  );
}
