import { ArrowUp, AudioLines, Ellipsis, Globe, Square } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import type { AnswerModelId } from "@/contracts/ask";
import { IconButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { cx } from "@/lib/recipe";
import { ModelSelect } from "./ModelSelect";

export interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void;
  /** A request is running: the send button becomes Stop. */
  running: boolean;
  onStop: () => void;
  model: AnswerModelId;
  onModelChange: (id: AnswerModelId) => void;
  autoFocus?: boolean;
}

/**
 * DESIGN.md, ChatComposer (`composer` token): one text field above a row of
 * actions. The field grows with the question up to `max-h-48`, then scrolls.
 */
export function ChatComposer({ value, onChange, onSubmit, running, onStop, model, onModelChange, autoFocus }: ChatComposerProps) {
  const question = value.trim();

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

  return (
    <form
      onSubmit={submit}
      className={cx(
        "flex w-full flex-col gap-2.5 rounded-xl bg-surface-container-lowest p-3 shadow-raised",
        "has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-primary-outline",
      )}
    >
      <Textarea
        variant="plain"
        autoResize
        className="mb-2.5 max-h-48"
        onKeyDown={handleKeyDown}
        aria-label="Question"
        placeholder="Ask about the candidate pool"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <ModelSelect value={model} onChange={onModelChange} />
          <IconButton aria-label="Search the web" variant="ghost" size="sm" disabled>
            <Globe aria-hidden />
          </IconButton>
          <IconButton aria-label="More options" variant="ghost" size="sm" disabled>
            <Ellipsis aria-hidden />
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label="Voice input" variant="ghost" size="sm" disabled>
            <AudioLines aria-hidden />
          </IconButton>
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
      </div>
    </form>
  );
}
