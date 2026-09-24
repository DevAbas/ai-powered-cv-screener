import type { Meta } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { CursorGridFalloff } from "./CursorGrid";
import { CursorGrid } from "./CursorGrid";

export default {
  title: "UI / CursorGrid",
} satisfies Meta;

/** The grid listens on its parent: the parent is the area the pointer lights. */
function Area({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="relative isolate flex h-80 w-full items-center justify-center rounded-md bg-surface">
      {children}
      {label && <span className="text-body-sm leading-body-sm text-on-surface-variant">{label}</span>}
    </div>
  );
}

/** Move the pointer over the area; click to send a ring. Nothing is drawn under reduced motion. */
export const Basic = () => (
  <Area label="Move the pointer here, or click">
    <CursorGrid className="-z-10" />
  </Area>
);

/** Content above the grid stays usable: the pointer lights the grid through it. */
export const UnderContent = () => (
  <Area>
    <CursorGrid className="-z-10" />
    <Button>Who has React and TypeScript?</Button>
  </Area>
);

const falloffs: CursorGridFalloff[] = ["linear", "smooth", "sharp"];

export const Falloffs = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {falloffs.map((falloff) => (
      <Area key={falloff} label={falloff}>
        <CursorGrid className="-z-10" falloff={falloff} />
      </Area>
    ))}
  </div>
);

/** A faint always-visible lattice and a fill on lit cells. */
export const LatticeAndFill = () => (
  <Area label="gridOpacity 0.08, fillOpacity 0.15">
    <CursorGrid className="-z-10" gridOpacity={0.08} fillOpacity={0.15} />
  </Area>
);
