import { ArrowUp, AudioLines, Square } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import type { AnswerModelId } from "@/contracts";
import type { ModelEntry } from "@/lib/models";
import { answerEntries } from "@/lib/models";
import { IconButton } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Tooltip } from "@/components/ui/Tooltip";
import { cx } from "@/components/ui/recipe";
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
  /**
   * The answer models offered; the model chip appears only when there is a choice.
   * @default answerEntries()
   */
  models?: readonly ModelEntry[];
  autoFocus?: boolean;
  /**
   * The field's placeholder; the empty state passes an example question.
   * @default "Ask about the candidate pool"
   */
  placeholder?: string;
}

/**
 * DESIGN.md, ChatComposer (`composer` token). With one model offered, one
 * row: the field with the actions at its right end, aligned to its last
 * line; with a choice, the field above a row of the model chip and the
 * actions. The field grows with the question up to `max-h-48`, then scrolls.
 */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  running,
  onStop,
  model,
  onModelChange,
  models = answerEntries(),
  autoFocus,
  placeholder = "Ask about the candidate pool",
}: ChatComposerProps) {
  const question = value.trim();
  const choice = models.length > 1;

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
      // One line with `py-1` is exactly the actions' height (1rem × 1.5 + 0.5rem = 2rem), so text and placeholder sit centred on them.
      className={cx("max-h-48", choice ? "mb-2.5" : "min-w-0 flex-1 py-1")}
      onKeyDown={handleKeyDown}
      aria-label="Question"
      placeholder={placeholder}
      autoComplete="off"
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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
        "flex w-full flex-col gap-2.5 rounded-xl bg-surface-container-lowest p-3 shadow-raised",
        "has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-primary-outline",
      )}
    >
      {choice ? (
        <>
          {field}
          <div className="flex items-center justify-between gap-2">
            {/* `min-w-0`: the chip may shrink and cut its name on narrow screens */}
            <div className="flex min-w-0 items-center">
              <ModelSelect value={model} onChange={onModelChange} entries={models} />
            </div>
            {actions}
          </div>
        </>
      ) : (
        // The actions stay on the field's last line as it grows.
        <div className="flex items-end gap-2">
          {field}
          {actions}
        </div>
      )}
    </form>
  );
}
