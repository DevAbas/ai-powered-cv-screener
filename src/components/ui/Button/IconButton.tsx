"use client";

import { Button } from "./Button";
import type { ButtonProps } from "./Button";

export interface IconButtonProps extends Omit<ButtonProps, "iconOnly"> {
  /** The button shows only its icon, so it needs an accessible name. */
  "aria-label": string;
}

/** A square Button that holds one icon. */
export function IconButton(props: IconButtonProps) {
  return <Button {...props} iconOnly />;
}
