import type { ComponentProps } from "react";
import type { RecipeVariantProps } from "@/theme/define-recipe";
import { separatorRecipe } from "@/theme/recipes/separator";

export interface SeparatorProps
  extends Omit<ComponentProps<"div">, "role">, RecipeVariantProps<typeof separatorRecipe> {}

/** A 1px rule in the single border colour. */
export function Separator({ orientation = "horizontal", className, ...rest }: SeparatorProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      {...rest}
      className={separatorRecipe({ orientation, className })}
    />
  );
}
