"use client";

import { Button as HeadlessButton } from "@headlessui/react";
import type { ButtonProps as HeadlessButtonProps } from "@headlessui/react";
import type { ComponentProps } from "react";
import { listSlotRecipe } from "@/theme/recipes/list";

const styles = listSlotRecipe();

////////////////////////////////////////////////////////////////////////////////

export type ListRootProps = ComponentProps<"ul">;

export function ListRoot({ className, ...rest }: ListRootProps) {
  return <ul {...rest} className={styles.root({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type ListItemProps = ComponentProps<"li">;

export function ListItem({ className, ...rest }: ListItemProps) {
  return <li {...rest} className={styles.item({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface ListItemTriggerProps extends Omit<HeadlessButtonProps, "as" | "className"> {
  /**
   * The row whose content is open elsewhere, such as the CV shown in the pool panel.
   * @default false
   */
  current?: boolean | undefined;
  className?: string | undefined;
}

/** Makes the whole row an action. */
export function ListItemTrigger({ current = false, className, type = "button", ...rest }: ListItemTriggerProps) {
  return (
    <HeadlessButton
      type={type}
      aria-current={current || undefined}
      {...rest}
      className={styles.itemTrigger({ className })}
    />
  );
}
