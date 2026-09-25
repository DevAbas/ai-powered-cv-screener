"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { formatElapsed, spokenElapsed } from "@/components/ui/ThoughtLine/elapsedTime";
import { thoughtLineSlotRecipe } from "./ThoughtLine.recipe";

export type ThoughtLineGlyph = "sparkle" | "dot" | "none" | ReactNode;

export interface ThoughtLineProps extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The working line; it breathes and is what a screen reader hears.
   * @default "Thinking…"
   */
  label?: string;
  /**
   * The settled line. Empty gives "Thought for", or "Done thinking" without the timer.
   * @default ""
   */
  doneLabel?: string;
  /**
   * The mark that breathes and dims.
   * @default "sparkle"
   */
  glyph?: ThoughtLineGlyph;
  /**
   * The trace beneath the line: the last step is current, earlier ones are ticked.
   * @default []
   */
  steps?: readonly string[];
  /**
   * The line toggles the trace, with a chevron.
   * @default true
   */
  collapsible?: boolean;
  /**
   * Fold the trace into the line when it settles.
   * @default true
   */
  collapseOnSettle?: boolean;
  /**
   * Working or settled; true again starts a new clock.
   * @default true
   */
  working?: boolean;
  /**
   * The live clock that freezes into the sentence.
   * @default true
   */
  showTimer?: boolean;
  /** Once per settle, with the frozen time in seconds. */
  onSettle?: (seconds: number) => void;
}

const EMPTY_STEPS: readonly string[] = [];
const TICK_MS = 100;

/**
 * A line that breathes while an agent works, then settles into "Thought for
 * 4.2s"; beneath it, the trace of steps. Motion in DESIGN.md, Layout.
 */
export function ThoughtLine({
  label = "Thinking…",
  doneLabel = "",
  glyph = "sparkle",
  steps = EMPTY_STEPS,
  collapsible = true,
  collapseOnSettle = true,
  working = true,
  showTimer = true,
  onSettle,
  className,
  ...rest
}: ThoughtLineProps) {
  // Mounted settled, the trace starts folded, as it would have folded on settling.
  const [open, setOpen] = useState(working || !collapseOnSettle);
  // Open again with each new run; fold on settle. Derived while rendering, as React advises for prop-driven state.
  const [seenWorking, setSeenWorking] = useState(working);
  if (working !== seenWorking) {
    setSeenWorking(working);
    if (working) setOpen(true);
    else if (collapseOnSettle) setOpen(false);
  }
  const doneText = doneLabel || (showTimer ? "Thought for" : "Done thinking");
  const hasTrace = steps.length > 0;
  const toggle = hasTrace && collapsible;

  const timerRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const stackRef = useRef<HTMLSpanElement>(null);
  const workRef = useRef<HTMLSpanElement>(null);
  const doneRef = useRef<HTMLSpanElement>(null);
  const tenthsRef = useRef(0);
  const prevWorking = useRef(working);

  // The clock writes straight to the DOM: ten updates a second are not a render each.
  useLayoutEffect(() => {
    const paint = (tenths: number) => {
      tenthsRef.current = tenths;
      if (timerRef.current) timerRef.current.textContent = formatElapsed(tenths);
    };
    if (!working) return undefined;
    const startedAt = performance.now();
    paint(0);
    const id = setInterval(() => paint(Math.floor((performance.now() - startedAt) / TICK_MS)), TICK_MS);
    return () => clearInterval(id);
  }, [working]);

  // Both labels share one grid cell; the cell is kept as wide as the active
  // one, so the clock and anything after it sit right behind the text and
  // glide over as the label changes.
  useLayoutEffect(() => {
    const stack = stackRef.current;
    if (!stack) return undefined;
    const fit = (glide: boolean) => {
      const active = working ? workRef.current : doneRef.current;
      if (!active) return;
      if (!glide) stack.style.transition = "none";
      stack.style.width = `${active.offsetWidth}px`;
      if (!glide) {
        void stack.offsetWidth;
        stack.style.transition = "";
      }
    };
    fit(prevWorking.current !== working);
    prevWorking.current = working;
    const observer = new ResizeObserver(() => fit(false));
    if (workRef.current) observer.observe(workRef.current);
    if (doneRef.current) observer.observe(doneRef.current);
    return () => observer.disconnect();
  }, [working, label, doneText]);

  // What a screen reader hears, written to the live region like the clock.
  useEffect(() => {
    if (working && statusRef.current) statusRef.current.textContent = label;
  }, [working, label]);
  // The settled sentence freezes the clock at the moment of settling; a later
  // prop change must not re-announce it, so the event reads the latest props.
  const settle = useEffectEvent(() => {
    const tenths = tenthsRef.current;
    if (statusRef.current) statusRef.current.textContent = showTimer ? `${doneText} ${spokenElapsed(tenths)}` : doneText;
    onSettle?.(tenths / 10);
  });
  useEffect(() => {
    if (!working) settle();
  }, [working]);

  const styles = thoughtLineSlotRecipe({ working, toggle });
  const head = (
    <>
      {glyph !== "none" && (
        <span aria-hidden className={styles.glyph()}>
          {glyph === "sparkle" ? (
            <Sparkles className="size-full" />
          ) : glyph === "dot" ? (
            <span className="m-auto size-2 rounded-full bg-current" />
          ) : (
            glyph
          )}
        </span>
      )}
      <span ref={stackRef} aria-hidden className={styles.label()}>
        <span ref={workRef} className={styles.text({ active: working })}>
          <span className={styles.breath()}>{label}</span>
        </span>
        <span ref={doneRef} className={styles.text({ active: !working, done: true })}>
          {doneText}
        </span>
      </span>
      {showTimer && (
        <span ref={timerRef} aria-hidden className={styles.timer()}>
          0.0s
        </span>
      )}
      {toggle && (
        <span aria-hidden className={styles.chevron()}>
          <ChevronDown className="size-full" />
        </span>
      )}
      <span ref={statusRef} role="status" className={styles.status()} />
    </>
  );

  return (
    <div {...rest} aria-busy={working} className={styles.root({ className })}>
      {toggle ? (
        <button type="button" aria-expanded={open} className={styles.head()} onClick={() => setOpen((v) => !v)}>
          {head}
        </button>
      ) : (
        <div className={styles.head()}>{head}</div>
      )}
      {hasTrace && (
        <div aria-hidden={!open} className={styles.trace()}>
          <div className={styles.fold()}>
            <ol className={styles.steps()}>
              {steps.map((text, i) => {
                const done = !working || i < steps.length - 1;
                return (
                  <li key={`${i}-${text}`} className={styles.step({ done })}>
                    <span aria-hidden className={styles.mark()}>
                      {done ? <Check className="size-full" /> : <span className={styles.pulse()} />}
                    </span>
                    <span>{text}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
