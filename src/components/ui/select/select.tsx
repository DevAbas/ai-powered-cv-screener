"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import type {
  ListboxButtonProps,
  ListboxOptionProps,
  ListboxOptionsProps,
  ListboxProps,
} from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps, Fragment } from "react";
import { selectSlotRecipe } from "@/theme/recipes/select";

const styles = selectSlotRecipe();

////////////////////////////////////////////////////////////////////////////////

export type SelectRootProps<T> = ListboxProps<typeof Fragment, T>;

/** Holds the selected value; one option is selected at a time. */
export function SelectRoot<T>(props: SelectRootProps<T>) {
  return <Listbox {...props} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface SelectTriggerProps extends Omit<ListboxButtonProps, "as" | "className"> {
  className?: string | undefined;
}

/** The chip that opens the menu. Give it an `aria-label` when its text is only the value. */
export function SelectTrigger({ className, ...rest }: SelectTriggerProps) {
  return <ListboxButton {...rest} className={styles.trigger({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type SelectValueTextProps = ComponentProps<"span">;

export function SelectValueText({ className, ...rest }: SelectValueTextProps) {
  return <span {...rest} className={styles.valueText({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface SelectIndicatorProps {
  className?: string | undefined;
}

export function SelectIndicator({ className }: SelectIndicatorProps) {
  return <ChevronDown aria-hidden className={styles.indicator({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface SelectContentProps extends Omit<ListboxOptionsProps, "as" | "className"> {
  className?: string | undefined;
}

/**
 * The floating menu of options.
 * @default anchor "bottom start"
 */
export function SelectContent({ className, anchor = "bottom start", ...rest }: SelectContentProps) {
  return <ListboxOptions anchor={anchor} transition {...rest} className={styles.content({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface SelectItemProps<T> extends Omit<ListboxOptionProps<"div", T>, "as" | "className"> {
  className?: string | undefined;
}

/** One option. `data-focus` marks the active row (focus stays on the menu); `aria-selected` the chosen one. */
export function SelectItem<T>({ className, ...rest }: SelectItemProps<T>) {
  return <ListboxOption {...rest} className={styles.item({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type SelectItemTextProps = ComponentProps<"span">;

export function SelectItemText({ className, ...rest }: SelectItemTextProps) {
  return <span {...rest} className={styles.itemText({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export interface SelectItemIndicatorProps {
  className?: string | undefined;
}

/** The `primary` check shown on the selected option only. */
export function SelectItemIndicator({ className }: SelectItemIndicatorProps) {
  return <Check aria-hidden className={styles.itemIndicator({ className })} />;
}
