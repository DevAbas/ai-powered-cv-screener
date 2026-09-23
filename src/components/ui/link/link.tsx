"use client";

import { Button as HeadlessButton } from "@headlessui/react";
import type { ButtonProps as HeadlessButtonProps } from "@headlessui/react";
import { linkRecipe } from "@/theme/recipes/link";

export interface LinkProps extends Omit<HeadlessButtonProps, "as" | "className"> {
  className?: string | undefined;
}

/**
 * Underlined text that runs an in-app action, such as opening a CV. It is a
 * button, not an anchor: it changes panel state instead of navigating.
 */
export function Link({ className, type = "button", ...rest }: LinkProps) {
  return <HeadlessButton type={type} {...rest} className={linkRecipe({ className })} />;
}
