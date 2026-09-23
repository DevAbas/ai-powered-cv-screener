import type { ComponentProps } from "react";
import { linkRecipe } from "./Link.recipe";

export type LinkProps = ComponentProps<"a">;

/** Underlined text that navigates, such as a source opening its CV. */
export function Link({ className, ...rest }: LinkProps) {
  return <a {...rest} className={linkRecipe({ className })} />;
}
