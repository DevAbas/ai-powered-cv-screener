import { ArrowUp, AudioLines, Ellipsis, Globe, Paperclip, Square } from "lucide-react";
import type { FormEvent } from "react";
import type { AnswerModelId } from "@/contracts/ask";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cx } from "@/theme/define-recipe";
import { ModelChip } from "./model-chip";

export interface ComposerProps {
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

/** DESIGN.md, Composer (`composer` token): one text input above a row of actions. */
export function Composer({ value, onChange, onSubmit, running, onStop, model, onModelChange, autoFocus }: ComposerProps) {
  const question = value.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!running && question) onSubmit(question);
  }

  return (
    <form
      onSubmit={submit}
      className={cx(
        "flex w-full flex-col gap-2 rounded-xl bg-surface-container-lowest p-3 shadow-raised",
        "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary-outline",
      )}
    >
      <Input
        variant="plain"
        aria-label="Question"
        placeholder="Ask about the candidate pool"
        autoComplete="off"
        maxLength={500}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <IconButton aria-label="Attach a file" variant="ghost" size="sm" disabled>
            <Paperclip aria-hidden />
          </IconButton>
          <ModelChip value={model} onChange={onModelChange} />
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
