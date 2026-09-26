import Markdown from "react-markdown";
import type { Components } from "react-markdown";

// The answer text, Markdown rendered with the design system's type and
// colour tokens only (DESIGN.md, Answer text). Paragraphs, lists and bold
// are what the prompt asks for; anything else renders as plain text, and
// raw HTML is never rendered. The text arrives once the final step ends,
// through the same delta path.

export interface AnswerTextProps {
  /** Markdown; may be partial while the answer streams. */
  text: string;
}

const BODY = "text-body-md text-on-surface";
const LIST_ITEM = `${BODY} marker:text-on-surface-variant`;
const HEADING = "text-headline-md text-on-surface";

// react-markdown passes its syntax-tree `node` to every component; only the children are rendered.
const COMPONENTS: Components = {
  p: ({ children }) => <p className={BODY}>{children}</p>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1.5 pl-5">{children}</ul>,
  ol: ({ children, start }) => (
    <ol start={start} className="flex list-decimal flex-col gap-1.5 pl-5">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className={LIST_ITEM}>{children}</li>,
  strong: ({ children }) => <strong className="font-(weight:--text-label-lg--font-weight) text-on-surface">{children}</strong>,
  em: ({ children }) => <em className="not-italic">{children}</em>,
  h1: ({ children }) => <p className={HEADING}>{children}</p>,
  h2: ({ children }) => <p className={HEADING}>{children}</p>,
  h3: ({ children }) => <p className={HEADING}>{children}</p>,
  a: ({ children }) => <>{children}</>,
  code: ({ children }) => <>{children}</>,
};

/** The answer text; it re-renders as each piece streams in. */
export function AnswerText({ text }: AnswerTextProps) {
  return (
    <div className="flex flex-col gap-3">
      <Markdown components={COMPONENTS} skipHtml>
        {text}
      </Markdown>
    </div>
  );
}
