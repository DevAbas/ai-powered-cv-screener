import { defineRecipe } from "@/components/ui/recipe";

// DESIGN.md, Model menu: the vendor logo at the 1rem icon size. A logo in its
// maker's colours shows as is; a single-colour mark is black in its file, so
// dark mode inverts it to stay visible.
export const vendorLogoRecipe = defineRecipe({
  base: "size-4 shrink-0",
  variants: {
    mark: {
      color: "",
      mono: "dark:invert",
    },
  },
  defaultVariants: {
    mark: "color",
  },
});
