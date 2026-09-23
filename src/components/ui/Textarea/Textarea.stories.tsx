import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Textarea } from "./Textarea";

export default {
  title: "UI / Textarea",
} satisfies Meta;

export const Basic = () => <Textarea aria-label="Notes" placeholder="Write a note" rows={3} />;

/** Grows with the text up to `max-h-48`, then scrolls. */
export const AutoResize = () => {
  const [value, setValue] = useState("");
  return (
    <div className="max-w-reading">
      <Textarea
        aria-label="Question"
        placeholder="Type several lines to see it grow"
        autoResize
        className="max-h-48"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
};

export const Disabled = () => <Textarea aria-label="Notes" placeholder="Write a note" disabled />;
