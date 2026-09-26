export interface PoolCountProps {
  poolSize: number;
}

/**
 * The CV count under the composer, as a quiet label (PRD, Core flow: entry;
 * DESIGN.md, Empty state). Last in the entrance: one stagger after the
 * composer (DESIGN.md, Layout: motion).
 */
export function PoolCount({ poolSize }: PoolCountProps) {
  return (
    // Capitals written, not transformed, so the s of "CVs" stays small (DESIGN.md, Empty state).
    <p className="motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--motion-delay-last-word)+var(--motion-stagger-entrance)*3)] text-center text-label-md tracking-(--text-label-sm--letter-spacing) text-on-surface-subtle">
      {poolSize} {poolSize === 1 ? "CV" : "CVs"} TO REVIEW
    </p>
  );
}
