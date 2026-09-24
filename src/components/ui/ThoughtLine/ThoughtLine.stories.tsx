import type { Meta } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { ThoughtLine } from "./ThoughtLine";

export default {
  title: "UI / ThoughtLine",
} satisfies Meta;

const STEPS = ["Reading the question", "Searching the pool", "Drafting an answer"];

export const Basic = () => <ThoughtLine steps={STEPS} />;

export const Settled = () => <ThoughtLine steps={STEPS} working={false} />;

export const WithoutTrace = () => <ThoughtLine />;

export const Glyphs = () => (
  <div className="flex flex-col gap-4">
    <ThoughtLine glyph="sparkle" showTimer={false} />
    <ThoughtLine glyph="dot" showTimer={false} />
    <ThoughtLine glyph="none" showTimer={false} />
  </div>
);

/** Steps arrive one by one, then the line settles and the trace folds. */
export const Live = () => {
  const [count, setCount] = useState(1);
  const working = count <= STEPS.length;
  useEffect(() => {
    if (!working) return;
    const id = setTimeout(() => setCount((c) => c + 1), 1_200);
    return () => clearTimeout(id);
  }, [count, working]);
  return <ThoughtLine steps={STEPS.slice(0, Math.min(count, STEPS.length))} working={working} label="Searching the pool…" doneLabel="Searched for" />;
};
