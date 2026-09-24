import type { ComponentProps } from "react";
import { tableSlotRecipe } from "./Table.recipe";

const styles = tableSlotRecipe();

////////////////////////////////////////////////////////////////////////////////

export type TableRootProps = ComponentProps<"table">;

export function TableRoot({ className, ...rest }: TableRootProps) {
  return <table {...rest} className={styles.root({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

/** Visually hidden; names the table for screen readers. */
export type TableCaptionProps = ComponentProps<"caption">;

export function TableCaption({ className, ...rest }: TableCaptionProps) {
  return <caption {...rest} className={styles.caption({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableHeaderProps = ComponentProps<"thead">;

export function TableHeader({ className, ...rest }: TableHeaderProps) {
  return <thead {...rest} className={styles.header({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableBodyProps = ComponentProps<"tbody">;

export function TableBody({ className, ...rest }: TableBodyProps) {
  return <tbody {...rest} className={styles.body({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableRowProps = ComponentProps<"tr">;

export function TableRow({ className, ...rest }: TableRowProps) {
  return <tr {...rest} className={styles.row({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableColumnHeaderProps = ComponentProps<"th">;

export function TableColumnHeader({ className, scope = "col", ...rest }: TableColumnHeaderProps) {
  return <th scope={scope} {...rest} className={styles.columnHeader({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableRowHeaderProps = ComponentProps<"th">;

/** The first cell of a row when it names the row; styled as a header. */
export function TableRowHeader({ className, scope = "row", ...rest }: TableRowHeaderProps) {
  return <th scope={scope} {...rest} className={styles.rowHeader({ className })} />;
}

////////////////////////////////////////////////////////////////////////////////

export type TableCellProps = ComponentProps<"td">;

export function TableCell({ className, ...rest }: TableCellProps) {
  return <td {...rest} className={styles.cell({ className })} />;
}
