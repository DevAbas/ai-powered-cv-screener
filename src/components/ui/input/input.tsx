"use client";

import { Input as HeadlessInput } from "@headlessui/react";
import type { InputProps as HeadlessInputProps } from "@headlessui/react";
import type { RecipeVariantProps } from "@/theme/define-recipe";
import { inputRecipe } from "@/theme/recipes/input";

export type InputBaseProps = RecipeVariantProps<typeof inputRecipe>;

export interface InputProps extends Omit<HeadlessInputProps, "as" | "className">, InputBaseProps {
  className?: string | undefined;
}

/** A single-line text field. */
export function Input({ variant, className, ...rest }: InputProps) {
  return <HeadlessInput {...rest} className={inputRecipe({ variant, className })} />;
}
