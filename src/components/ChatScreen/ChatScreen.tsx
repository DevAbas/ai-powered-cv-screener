"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CvSource, SourceHref } from "@/components/Answer";
import { OpenSourceProvider } from "@/components/Answer";
import { CvPreview } from "@/components/CvPreview";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatExchange } from "@/components/ChatExchange";
import { CursorGrid } from "@/components/ui/CursorGrid";
import { useChatScreen } from "@/hooks/useChatScreen";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useFollowScroll } from "@/hooks/useFollowScroll";
import type { AskTransport } from "@/lib/conversation";
import type { PoolCandidate } from "@/lib/candidates";
import { AppHeader } from "@/components/AppHeader";
import { cvSourceHref } from "@/lib/candidates";
import { EXAMPLE_QUESTION } from "@/lib/conversation";
import { cx } from "@/components/ui/recipe";

export interface ChatScreenProps {
  /** Every CV in the pool: its size is shown in the empty state. */
  pool: readonly PoolCandidate[];
  /** Links sources to their PDF: the CV route in the app, the static copy in previews (PLAN, User interface). */
  sourceHref?: SourceHref | undefined;
  /** Where questions go: the API by default, the mock in previews and tests. */
  transport?: AskTransport | undefined;
}

/** The chat: header, conversation and composer in one column (PRD, Information architecture). */
export function ChatScreen({ pool, sourceHref = cvSourceHref, transport }: ChatScreenProps) {
  const chat = useChatScreen({ transport });
  const { exchanges } = chat.state;
  const { model } = chat;
  const [draft, setDraft] = useState("");
  const lastExchange = useRef<HTMLLIElement>(null);
  // The empty state's headline and composer: the grid behind them keeps clear of both.
  const emptyStateText = useRef<HTMLDivElement>(null);
  const emptyStateComposer = useRef<HTMLDivElement>(null);
  // The composer floats over the end of the conversation: scrolling to the
  // last exchange leaves its height free (scroll-margin-bottom, below).
  const [composerBar, composerHeight] = useElementHeight();
  const last = exchanges.at(-1);
  // Anything that makes the last exchange grow: a stage, the answer, an error.
  // Anything that makes the last exchange grow, including each piece of streamed text.
  const lastSignal = last ? `${last.status}:${last.steps.length}:${last.slow}:${last.text.length}:${last.view?.kind ?? ""}:${last.error?.message ?? ""}` : "";
  const follow = useFollowScroll(lastExchange, last?.id ?? "", lastSignal);

  // The CV open beside the conversation, and the room it takes on the right.
  const [preview, setPreview] = useState<CvSource | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const closePreview = useCallback(() => setPreview(null), []);
  const previewHref = preview ? sourceHref(preview.candidateId, preview.page)?.split("#")[0] : undefined;

  // Keep the newest question in view as it is asked.
  useEffect(() => {
    lastExchange.current?.scrollIntoView({ block: "start" });
  }, [exchanges.length]);

  function ask(question: string) {
    chat.ask(question);
    setDraft("");
    follow();
  }

  function retry(exchangeId: string) {
    chat.retry(exchangeId);
    follow();
  }

  // The empty state's composer shows an example question (DESIGN.md, Empty state).
  const composer = (placeholder?: string) => (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={ask}
      running={chat.running}
      onStop={chat.stop}
      model={model}
      onModelChange={chat.setModel}
      autoFocus
      placeholder={placeholder}
    />
  );

  return (
    <OpenSourceProvider onOpen={setPreview}>
      {/* From `lg` the conversation makes room for the docked preview; below, the preview covers it. */}
      <div
        className={cx("flex min-h-dvh flex-col transition-[padding]", preview && previewHref && "lg:pr-(--preview-width)")}
        style={{ "--preview-width": `${previewWidth}px` } as CSSProperties}
      >
        <AppHeader />
        <main aria-label="Conversation" className="flex flex-1 flex-col">
          {exchanges.length === 0 ? (
            // `isolate`: the grid sits behind the empty state, above the page background.
            <div className="relative isolate flex flex-1 flex-col items-center justify-center gap-8 px-gutter py-16">
              <CursorGrid className="-z-10" clearOf={[emptyStateText, emptyStateComposer]} />
              <ChatEmptyState ref={emptyStateText} poolSize={pool.length} />
              {/* Third in the entrance (DESIGN.md, Layout: motion); it takes input from the first frame. */}
              <div
                ref={emptyStateComposer}
                className="w-full max-w-composer motion-safe:animate-rise motion-safe:[animation-delay:calc(var(--empty-state-word-delay)+var(--empty-state-stagger)*2)]"
              >
                {composer(EXAMPLE_QUESTION)}
              </div>
            </div>
          ) : (
            <>
              {/* The gutter sits outside the column, as for the composer, so both share one left edge. */}
              <div className="flex-1 px-gutter">
                <ol aria-label="Questions and answers" className="mx-auto flex w-full max-w-reading flex-col gap-10 py-8">
                  {exchanges.map((exchange, i) => (
                    <li
                      key={exchange.id}
                      ref={i === exchanges.length - 1 ? lastExchange : undefined}
                      // The last exchange fills the space between header and composer exactly
                      // (viewport minus the header, the list's padding and the composer), so a new
                      // question scrolls to the top, only it and its answer are in view, and a
                      // short answer leaves nothing further to scroll.
                      className={cx(
                        "scroll-mt-22 scroll-mb-(--composer-height)",
                        i === exchanges.length - 1 && "min-h-[calc(100dvh_-_var(--spacing-base)*30_-_var(--composer-height))]",
                      )}
                      style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
                    >
                      <ChatExchange
                        question={exchange.question}
                        status={exchange.status}
                        steps={exchange.steps}
                        slow={exchange.slow}
                        text={exchange.text}
                        view={exchange.view}
                        matched={exchange.matched}
                        answeredBy={exchange.answeredBy}
                        error={exchange.error}
                        sourceHref={sourceHref}
                        onRetry={() => retry(exchange.id)}
                      />
                    </li>
                  ))}
                </ol>
              </div>
              {/*
                The composer floats: the bar around it is transparent, so the
                conversation stays visible as it passes beneath and beside it.
              */}
              <div ref={composerBar} className="sticky bottom-0 px-gutter pb-gutter">
                <div className="mx-auto w-full max-w-composer">{composer()}</div>
              </div>
            </>
          )}
        </main>
      </div>
      {preview && previewHref && (
        <CvPreview
          candidateId={preview.candidateId}
          name={preview.name}
          page={preview.page}
          href={previewHref}
          onClose={closePreview}
          onResize={setPreviewWidth}
        />
      )}
    </OpenSourceProvider>
  );
}
