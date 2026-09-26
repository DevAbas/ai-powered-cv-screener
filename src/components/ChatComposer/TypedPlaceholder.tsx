"use client";

import { useEffect, useState } from "react";
import { delayFor, INITIAL_STATE, nextStep, shownText } from "./typewriter";
import type { TypedState } from "./typewriter";

export interface TypedPlaceholderProps {
  /** The example questions, typed in turn. */
  texts: readonly string[];
}

/**
 * The empty state's placeholder (DESIGN.md, Composer): the example questions
 * typed one after another over the field's first line, with a bar cursor
 * blinking once a second. Presentational: the field keeps its own label.
 */
export function TypedPlaceholder({ texts }: TypedPlaceholderProps) {
  const [state, setState] = useState<TypedState>(INITIAL_STATE);

  useEffect(() => {
    const timer = window.setTimeout(() => setState((current) => nextStep(current, texts)), delayFor(state));
    return () => window.clearTimeout(timer);
  }, [state, texts]);

  return (
    // `input-placeholder`: the field's placeholder colour and type; padded as the field is, so the text sits where typed text will.
    <span aria-hidden className="pointer-events-none absolute top-0 left-0 max-w-full overflow-hidden px-1 py-1 text-body-lg whitespace-nowrap text-outline-variant">
      {shownText(state, texts)}
      {/* DESIGN.md, Composer: a 1px bar, one line tall, blinking once a second. */}
      <span className="ml-px inline-block h-[1em] w-px translate-y-[0.15em] bg-outline-variant motion-safe:animate-blink" />
    </span>
  );
}
