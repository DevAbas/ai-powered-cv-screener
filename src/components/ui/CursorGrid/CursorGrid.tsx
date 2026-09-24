"use client";

import { useEffect, useRef } from "react";
import type { HTMLAttributes, RefObject } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cursorGridSlotRecipe } from "./CursorGrid.recipe";

// An invisible lattice of cells that light up around the pointer and fade
// (DESIGN.md, Layout: motion). Adapted from the open-source CursorGrid
// component: typed, coloured by the `primary` token, and off under reduced
// motion. It covers its parent, lets every pointer event through to the
// content above it, and listens on the parent instead.

export type CursorGridFalloff = "linear" | "smooth" | "sharp";

export interface CursorGridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Size of each cell in px.
   * @default 65
   */
  cellSize?: number;
  /**
   * Radius in px around the pointer within which cells light up.
   * @default 140
   */
  radius?: number;
  /**
   * Curve from distance to brightness.
   * @default "sharp"
   */
  falloff?: CursorGridFalloff;
  /**
   * How long in ms a cell stays lit before it fades.
   * @default 400
   */
  holdTime?: number;
  /**
   * How long in ms a fully lit cell takes to fade out.
   * @default 800
   */
  fadeDuration?: number;
  /**
   * Stroke width of the cell outlines in px.
   * @default the theme's `--cursor-grid-line-width` (1px light, 0.5px dark)
   */
  lineWidth?: number;
  /**
   * Peak opacity of a cell under the pointer.
   * @default 1
   */
  maxOpacity?: number;
  /**
   * Fill of lit cells, relative to their stroke; 0 disables it.
   * @default 0
   */
  fillOpacity?: number;
  /**
   * Opacity of an always-visible lattice; 0 hides it.
   * @default 0
   */
  gridOpacity?: number;
  /**
   * Corner radius of the cells in px.
   * @default 12
   */
  cellRadius?: number;
  /**
   * A click sends a ring of lit cells outward.
   * @default true
   */
  clickPulse?: boolean;
  /**
   * Speed of the click ring in px per second.
   * @default 600
   */
  pulseSpeed?: number;
  /**
   * Elements the grid keeps clear of: no lit cell is drawn over them.
   * @default []
   */
  clearOf?: readonly RefObject<HTMLElement | null>[];
  /**
   * Room in px kept around each element in `clearOf`.
   * @default 12
   */
  clearMargin?: number;
}

type GridSettings = Required<Omit<CursorGridProps, keyof HTMLAttributes<HTMLDivElement> | "lineWidth">> &
  Pick<CursorGridProps, "lineWidth">;

const NO_ELEMENTS: readonly RefObject<HTMLElement | null>[] = [];

/** When neither the prop nor the theme sets a width. */
const FALLBACK_LINE_WIDTH = 0.5;

const FALLOFF: Record<CursorGridFalloff, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  sharp: (t) => t * t * t,
};

/** "rgb(0, 248, 192)" → [0, 248, 192]: the computed token colour, whatever the theme. */
function rgbOf(color: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return [r, g, b];
}

interface Pulse {
  x: number;
  y: number;
  t0: number;
}

export function CursorGrid({
  cellSize = 65,
  radius = 140,
  falloff = "sharp",
  holdTime = 400,
  fadeDuration = 800,
  lineWidth,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 12,
  clickPulse = true,
  pulseSpeed = 600,
  clearOf = NO_ELEMENTS,
  clearMargin = 12,
  className,
  ...props
}: CursorGridProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = useRef<GridSettings | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const styles = cursorGridSlotRecipe();

  // The animation reads the latest props each frame without restarting.
  useEffect(() => {
    settings.current = {
      cellSize,
      radius,
      falloff,
      holdTime,
      fadeDuration,
      lineWidth,
      maxOpacity,
      fillOpacity,
      gridOpacity,
      cellRadius,
      clickPulse,
      pulseSpeed,
      clearOf,
      clearMargin,
    };
    wakeRef.current?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const target = container?.parentElement;
    if (reducedMotion || !container || !canvas || !ctx || !target) return;
    const s = () => settings.current as GridSettings;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // One alpha and one last-lit time per cell, row-major.
    let cols = 0;
    let rows = 0;
    let offX = 0;
    let offY = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    let w = 0;
    let h = 0;
    const pulses: Pulse[] = [];
    let raf = 0;
    let running = false;
    let lastFrame = 0;

    const rebuild = () => {
      const size = s().cellSize;
      w = container.offsetWidth;
      h = container.offsetHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / size) + 1;
      rows = Math.ceil(h / size) + 1;
      // Centred, so the edge cells crop evenly on both sides.
      offX = (w - cols * size) / 2;
      offY = (h - rows * size) / 2;
      alphas = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);
    };

    const centre = (i: number): [number, number] => {
      const size = s().cellSize;
      return [offX + (i % cols) * size + size / 2, offY + Math.floor(i / cols) * size + size / 2];
    };

    /** Cells within `reach` of (x, y), as index ranges. */
    const around = (x: number, y: number, reach: number) => {
      const size = s().cellSize;
      return {
        minCol: Math.max(0, Math.floor((x - reach - offX) / size)),
        maxCol: Math.min(cols - 1, Math.floor((x + reach - offX) / size)),
        minRow: Math.max(0, Math.floor((y - reach - offY) / size)),
        maxRow: Math.min(rows - 1, Math.floor((y + reach - offY) / size)),
      };
    };

    // Light every cell whose centre is within the radius, brighter nearer the pointer.
    const energize = (x: number, y: number) => {
      const p = s();
      const r = Math.max(p.radius, 1);
      const ease = FALLOFF[p.falloff];
      const now = performance.now();
      const { minCol, maxCol, minRow, maxRow } = around(x, y, r);
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const i = row * cols + col;
          const [cx, cy] = centre(i);
          const dist = Math.hypot(cx - x, cy - y);
          if (dist > r) continue;
          const level = ease(1 - dist / r) * p.maxOpacity;
          if (level > alphas[i]) alphas[i] = level;
          if (level > 0) touched[i] = now;
        }
      }
    };

    const draw = (now: number) => {
      const p = s();
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      ctx.clearRect(0, 0, w, h);
      // Read each frame, so a theme switch restyles the strokes at once.
      const computed = getComputedStyle(canvas);
      const [cr, cg, cb] = rgbOf(computed.color);
      const strokeWidth =
        p.lineWidth ?? (parseFloat(computed.getPropertyValue("--cursor-grid-line-width")) || FALLBACK_LINE_WIDTH);
      const rgba = (a: number) => `rgba(${cr}, ${cg}, ${cb}, ${a})`;
      // Where the content sits this frame (it may still be entering), in canvas coordinates.
      const origin = canvas.getBoundingClientRect();
      const clear = p.clearOf.flatMap((ref) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return [];
        const m = p.clearMargin;
        return [{ left: r.left - origin.left - m, right: r.right - origin.left + m, top: r.top - origin.top - m, bottom: r.bottom - origin.top + m }];
      });

      if (p.gridOpacity > 0) {
        ctx.strokeStyle = rgba(p.gridOpacity);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let col = 0; col <= cols; col++) {
          const x = Math.round(offX + col * p.cellSize) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let row = 0; row <= rows; row++) {
          const y = Math.round(offY + row * p.cellSize) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      // A click ring lights the cells it passes.
      for (let pi = pulses.length - 1; pi >= 0; pi--) {
        const pulse = pulses[pi];
        const ringR = ((now - pulse.t0) / 1000) * p.pulseSpeed;
        if (ringR > Math.hypot(w, h)) {
          pulses.splice(pi, 1);
          continue;
        }
        const { minCol, maxCol, minRow, maxRow } = around(pulse.x, pulse.y, ringR + p.cellSize);
        for (let row = minRow; row <= maxRow; row++) {
          for (let col = minCol; col <= maxCol; col++) {
            const i = row * cols + col;
            const [cx, cy] = centre(i);
            const dist = Math.hypot(cx - pulse.x, cy - pulse.y);
            if (Math.abs(dist - ringR) < p.cellSize / 2 && p.maxOpacity > alphas[i]) {
              alphas[i] = p.maxOpacity;
              touched[i] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = dt / Math.max(p.fadeDuration, 16);
      const half = p.cellSize / 2;
      for (let i = 0; i < alphas.length; i++) {
        let a = alphas[i];
        if (a <= 0) continue;
        if (now - touched[i] > p.holdTime) {
          a = Math.max(0, a - fadeStep);
          alphas[i] = a;
          if (a <= 0) continue;
        }
        anyVisible = true;
        const [cx, cy] = centre(i);
        const x = cx - half + 0.5;
        const y = cy - half + 0.5;
        const side = p.cellSize - 1;
        // Still fading, just not drawn where it would cover content.
        if (clear.some((r) => x < r.right && x + side > r.left && y < r.bottom && y + side > r.top)) continue;
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize);
        gradient.addColorStop(0, rgba(a));
        gradient.addColorStop(1, rgba(0));
        ctx.beginPath();
        if (p.cellRadius > 0) ctx.roundRect(x, y, side, side, p.cellRadius);
        else ctx.rect(x, y, side, side);
        if (p.fillOpacity > 0) {
          ctx.fillStyle = rgba(a * p.fillOpacity);
          ctx.fill();
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }

      // Idle, with only the static lattice (if any) drawn: no frames until the pointer moves again.
      if (anyVisible) raf = requestAnimationFrame(draw);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      raf = requestAnimationFrame(draw);
    };
    wakeRef.current = wake;

    const local = (event: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    const onPointerMove = (event: PointerEvent) => {
      energize(...local(event));
      wake();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!s().clickPulse) return;
      const [x, y] = local(event);
      pulses.push({ x, y, t0: performance.now() });
      wake();
    };

    const resize = new ResizeObserver(() => {
      rebuild();
      wake();
    });
    resize.observe(container);
    rebuild();
    target.addEventListener("pointermove", onPointerMove);
    target.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      wakeRef.current = null;
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerdown", onPointerDown);
      ctx.clearRect(0, 0, w, h);
    };
    // A new cell size means a new lattice; every other prop is read per frame.
  }, [reducedMotion, cellSize]);

  return (
    <div ref={containerRef} aria-hidden {...props} className={styles.root({ className })}>
      {!reducedMotion && <canvas ref={canvasRef} className={styles.canvas()} />}
    </div>
  );
}
