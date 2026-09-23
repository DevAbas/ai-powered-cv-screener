"use client";

import { Button as HeadlessButton } from "@headlessui/react";
import type { ButtonProps as HeadlessButtonProps } from "@headlessui/react";
import type { RecipeVariantProps } from "@/lib/recipe";
import { buttonRecipe } from "./Button.recipe";

export type ButtonBaseProps = RecipeVariantProps<typeof buttonRecipe>;

export interface ButtonProps extends Omit<HeadlessButtonProps, "as" | "className">, ButtonBaseProps {
  className?: string | undefined;
}

/**
 * The single main action is `primary`; everything else is `secondary`, and
 * bare icon actions are `ghost` (via IconButton).
 */
export function Button({ variant, size, iconOnly, className, type = "button", ...rest }: ButtonProps) {
  return <HeadlessButton type={type} {...rest} className={buttonRecipe({ variant, size, iconOnly, className })} />;
}
