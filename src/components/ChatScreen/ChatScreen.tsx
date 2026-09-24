"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { SourceHref } from "@/components/Answer";
import { ChatComposer } from "@/components/ChatComposer";
import { ChatEmptyState } from "@/components/ChatEmptyState";
import { ChatExchange } from "@/components/ChatExchange";
import { useChatScreen } from "@/hooks/useChatScreen";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useFollowScroll } from "@/hooks/useFollowScroll";
import { answerToText } from "@/lib/answer-text";
import type { PoolCandidate } from "@/lib/pool/candidate";
import { AppHeader } from "@/components/AppHeader";
import { cvSourceHref } from "@/lib/pool/source-href";
import { cx } from "@/lib/recipe";

export interface ChatScreenProps {
  /** Every CV in the pool: its size is shown, and names resolve from it. */
  pool: readonly PoolCandidate[];
  /** Suggested questions for the empty state (PRD, Core flow: Entry). */
  suggestions: readonly string[];
  /** Links sources to their PDF; left out until the PDFs exist (PLAN, User interface). */
  sourceHref?: SourceHref | undefined;
}

/** The chat: header, conversation and composer in one column (PRD, Information architecture). */
export function ChatScreen({ pool, suggestions, sourceHref = cvSourceHref }: ChatScreenProps) {
  const chat = useChatScreen();
  const { exchanges, model } = chat.state;
  const [draft, setDraft] = useState("");
  const lastExchange = useRef<HTMLLIElement>(null);
  // The composer floats over the end of the conversation: scrolling to the
  // last exchange leaves its height free (scroll-margin-bottom, below).
  const [composerBar, composerHeight] = useElementHeight();
  const last = exchanges.at(-1);
  // Anything that makes the last exchange grow: a stage, the answer, an error.
  const lastSignal = last ? `${last.id}:${last.status}:${last.steps.length}:${last.slow}:${last.answer ? 1 : 0}:${last.error?.message ?? ""}` : "";
  const follow = useFollowScroll(lastExchange, lastSignal);

  const names = useMemo(() => new Map(pool.map((c) => [c.id, c.profile.name])), [pool]);
  const nameOf = (id: string) => names.get(id) ?? id;

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

  const composer = (
    <ChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={ask}
      running={chat.running}
      onStop={chat.stop}
      model={model}
      onModelChange={chat.setModel}
      autoFocus
    />
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main aria-label="Conversation" className="flex flex-1 flex-col">
        {exchanges.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-gutter py-16">
            <ChatEmptyState poolSize={pool.length} suggestions={suggestions} onAsk={ask} />
            <div className="w-full max-w-composer">{composer}</div>
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
                    // The last exchange fills the space between header and composer, so a new
                    // question always scrolls to the top and only it and its answer are in view.
                    className={cx(
                      "scroll-mt-22 scroll-mb-(--composer-height)",
                      i === exchanges.length - 1 && "min-h-[calc(100dvh_-_var(--spacing-base)*22_-_var(--composer-height))]",
                    )}
                    style={{ "--composer-height": `${composerHeight}px` } as CSSProperties}
                  >
                    <ChatExchange
                      question={exchange.question}
                      status={exchange.status}
                      steps={exchange.steps}
                      slow={exchange.slow}
                      answer={exchange.answer}
                      error={exchange.error}
                      nameOf={nameOf}
                      sourceHref={sourceHref}
                      onRetry={() => retry(exchange.id)}
                      onCopy={async () => {
                        if (exchange.answer) await navigator.clipboard.writeText(answerToText(exchange.answer, nameOf));
                      }}
                    />
                  </li>
                ))}
              </ol>
            </div>
            {/*
              The page colour starts exactly at the composer's top edge: no band
              above it cuts the answers early, and nothing shows through the
              composer's rounded corners.
            */}
            <div ref={composerBar} className="sticky bottom-0 bg-surface px-gutter pb-gutter">
              <div className="mx-auto w-full max-w-composer">{composer}</div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
