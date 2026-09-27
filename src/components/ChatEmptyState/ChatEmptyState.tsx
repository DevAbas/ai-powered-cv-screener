"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, Ref } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cx } from "@/components/ui/recipe";

/** The headline's words; each rises one word-stagger after the last, the last one with the frame around it. */
const WORDS = ["Find", "The", "Right", "Candidates"] as const;
/** The word in focus when the pointer is on none: the last. */
const LAST = WORDS.length - 1;

export interface ChatEmptyStateProps {
  /** The headline block, for the grid behind it to keep clear of. */
  ref?: Ref<HTMLDivElement>;
}

/** A word's box within the headline, in px. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Entry: the headline, never a blank screen (PRD, Core flow; DESIGN.md, Empty state); the CV count is `PoolCount`, under the composer. */
export function ChatEmptyState({ ref }: ChatEmptyStateProps) {
  const reducedMotion = usePrefersReducedMotion();
  const headline = useRef<HTMLHeadingElement>(null);
  const wordElements = useRef<(HTMLElement | null)[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [frame, setFrame] = useState<Box | null>(null);

  // In focus: the word under the pointer, otherwise "Candidates" (DESIGN.md, Empty state); still under reduced motion.
  const focused = reducedMotion ? LAST : (hovered ?? LAST);

  /**
   * The frame's box: the focused word's layout position within the headline
   * (its offset parent). Layout, not the bounding rectangle: the entrance
   * moves the words by transform, and the frame should sit where a word
   * lands, not where it is mid-flight.
   */
  const measure = useCallback(() => {
    const word = wordElements.current[focused];
    if (!word) return;
    setFrame({ x: word.offsetLeft, y: word.offsetTop, width: word.offsetWidth, height: word.offsetHeight });
  }, [focused]);

  useLayoutEffect(measure, [measure]);

  // The words move when the column narrows or the font arrives: the frame follows.
  useEffect(() => {
    const container = headline.current;
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      {/* DESIGN.md, Layout: motion. The words rise one after another, "Candidates" last with the frame fading in around it. */}
      <h2
        ref={headline}
        aria-label="Find the right candidates"
        className="relative inline-flex max-w-full cursor-default flex-wrap items-baseline justify-center gap-x-5 text-display text-on-surface"
        onPointerLeave={() => setHovered(null)}
        // The entrance moves the words by transform, which no observer sees: once a word's rise ends, the frame is measured again.
        onAnimationEnd={measure}
      >
        {WORDS.map((word, i) => (
          <span
            key={word}
            ref={(element) => {
              wordElements.current[i] = element;
            }}
            aria-hidden
            onPointerEnter={() => setHovered(i)}
            className={cx(
              "inline-block motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--motion-stagger-entrance-word)*var(--word-index))]",
              // DESIGN.md, Empty state: the leading words in `display-light`; "Candidates" keeps `display`.
              i < LAST && "text-display-light font-display-light",
              // DESIGN.md, Empty state: the words not in focus blur softly; the focused one is sharp.
              "motion-safe:transition-[filter] motion-safe:duration-(--motion-duration-focus-move) motion-safe:ease-standard",
              focused === i ? "blur-none" : "motion-safe:blur-(--motion-blur-out-of-focus)",
            )}
            style={{ "--word-index": i } as CSSProperties}
          >
            {word}
          </span>
        ))}
        <FocusFrame box={frame} />
      </h2>
    </div>
  );
}

/** DESIGN.md, Empty state: four `primary` corners set just outside the focused word's box, no glow; here 1rem squares with 3px strokes, 0.5rem out. */
const CORNERS = ["-top-2 -left-2 border-t-3 border-l-3", "-top-2 -right-2 border-t-3 border-r-3", "-bottom-2 -left-2 border-b-3 border-l-3", "-right-2 -bottom-2 border-r-3 border-b-3"];

/** The frame on the focused word: moved and resized by transition, so it slides from word to word. */
function FocusFrame({ box }: { box: Box | null }) {
  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute top-0 left-0 motion-safe:transition-[transform,width,height] motion-safe:duration-(--motion-duration-focus-move) motion-safe:ease-standard",
        "motion-safe:animate-fade-in motion-safe:[animation-delay:var(--motion-delay-last-word)]",
        !box && "invisible",
      )}
      style={box ? { transform: `translate(${box.x}px, ${box.y}px)`, width: box.width, height: box.height } : undefined}
    >
      {CORNERS.map((corner) => (
        <span key={corner} className={cx("absolute size-4 border-primary", corner)} />
      ))}
    </div>
  );
}
