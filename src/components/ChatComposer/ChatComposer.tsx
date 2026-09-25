import { ArrowUp, AudioLines, Square } from "lucide-react";
import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { IconButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Tooltip } from "@/components/ui/Tooltip";
import { cx } from "@/components/ui/recipe";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TypedPlaceholder } from "./TypedPlaceholder";

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void;
  /** A request is running: the send button becomes Stop. */
  running: boolean;
  onStop: () => void;
  autoFocus?: boolean;
  /**
   * The field's placeholder. A list is typed out one question after another
   * over the empty, unfocused field (the empty state's example questions);
   * under reduced motion its first entry shows still.
   * @default "Ask about the candidate pool"
   */
  placeholder?: string | readonly string[];
}

/**
 * DESIGN.md, ChatComposer (`composer` token): one row, the field with the
 * actions at its right end, aligned to its last line. The field grows with
 * the question up to `max-h-48`, then scrolls.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  running,
  onStop,
  autoFocus,
  placeholder = "Ask about the candidate pool",
}: ChatComposerProps) {
  const question = value.trim();
  const reducedMotion = usePrefersReducedMotion();
  // The typed placeholder shows only while the field is empty and unfocused: a focused field is the recruiter's.
  const [focused, setFocused] = useState(false);
  const typed = typeof placeholder === "string" || reducedMotion ? undefined : placeholder;
  const staticPlaceholder = typeof placeholder === "string" ? placeholder : reducedMotion ? placeholder[0] : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!running && question) onSubmit(question);
  }

  /** Enter sends; Shift+Enter starts a new line. Not while an IME is composing. */
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const field = (
    <Textarea
      variant="plain"
      autoResize
      // One line with `py-1` is exactly the actions' height (1rem × 1.5 + 0.5rem = 2rem), so a last line sits centred on them;
      // DESIGN.md, Composer: the field is at least two lines tall, so the actions sit under the first line's text.
      className="max-h-48 min-h-14 min-w-0 flex-1 py-1"
      onKeyDown={handleKeyDown}
      aria-label="Question"
      placeholder={staticPlaceholder}
      autoComplete="off"
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      {/* A disabled button gets no pointer events: `pointer-events-none` lets the tooltip's wrapper see the hover. */}
      <Tooltip content="Voice mode coming soon…">
        {(trigger) => (
          <IconButton {...trigger} aria-label="Voice input" variant="ghost" size="sm" disabled className="pointer-events-none">
            <AudioLines aria-hidden />
          </IconButton>
        )}
      </Tooltip>
      {running ? (
        <IconButton key="stop" variant="primary" size="sm" aria-label="Stop" onClick={onStop}>
          <Square aria-hidden className="size-4 fill-current" />
        </IconButton>
      ) : (
        <IconButton key="send" type="submit" variant="primary" size="sm" aria-label="Send" disabled={!question}>
          <ArrowUp aria-hidden />
        </IconButton>
      )}
    </div>
  );

  return (
    <form
      onSubmit={submit}
      className={cx(
        // DESIGN.md, Composer: an `outline` border and the raised shadow, so the card reads on `surface` at rest.
        "flex w-full flex-col gap-2.5 rounded-xl border border-outline bg-surface-container-lowest p-4 shadow-raised",
        "has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-primary-outline",
      )}
    >
      {/* The actions stay on the field's last line as it grows. */}
      <div className="flex items-end gap-2">
        {typed ? (
          // The typed placeholder lies over the field's first line while it is empty.
          <div className="relative min-w-0 flex-1">
            {field}
            {value === "" && !focused && <TypedPlaceholder texts={typed} />}
          </div>
        ) : (
          field
        )}
        {actions}
      </div>
    </form>
  );
}
