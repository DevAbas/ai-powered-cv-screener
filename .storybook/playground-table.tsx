import type { ReactNode } from "react";

// A grid for variant tables in stories.
export function PlaygroundTable({ children }: { children: ReactNode }) {
  return (
    <table className="border-separate border-spacing-x-4 border-spacing-y-3 text-left text-body-sm text-on-surface-variant">
      {children}
    </table>
  );
}
