"use client";

import { Textarea as HeadlessTextarea } from "@headlessui/react";
import type { TextareaProps as HeadlessTextareaProps } from "@headlessui/react";
import { useLayoutEffect, useRef } from "react";
import type { InputEvent } from "react";
import type { RecipeVariantProps } from "@/components/ui/recipe";
import { textareaRecipe } from "./Textarea.recipe";

export type TextareaBaseProps = RecipeVariantProps<typeof textareaRecipe>;

export interface TextareaProps extends Omit<HeadlessTextareaProps, "as" | "className" | "ref">, TextareaBaseProps {
  className?: string | undefined;
}

/** Fits the height to the content; CSS `max-height` caps it and the rest scrolls. */
function fitHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

/** A multi-line text field. With `autoResize` it grows as the text grows. */
export function Textarea({ variant, autoResize = false, className, onInput, value, rows = 1, ...rest }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Refit when the value changes from outside too, such as being cleared after submit.
  useLayoutEffect(() => {
    if (autoResize && ref.current) fitHeight(ref.current);
  }, [autoResize, value]);

  function handleInput(event: InputEvent<HTMLTextAreaElement>) {
    if (autoResize) fitHeight(event.currentTarget);
    onInput?.(event);
  }

  return (
    <HeadlessTextarea
      ref={ref}
      rows={rows}
      value={value}
      {...rest}
      onInput={handleInput}
      className={textareaRecipe({ variant, autoResize, className })}
    />
  );
}
