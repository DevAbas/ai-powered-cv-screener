import { Button } from "@/components/ui/Button";

export interface ChatEmptyStateProps {
  poolSize: number;
  suggestions: readonly string[];
  onAsk: (question: string) => void;
}

/** Entry: pool size and suggested questions, never a blank screen (PRD, Core flow). */
export function ChatEmptyState({ poolSize, suggestions, onAsk }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h2 className="text-headline-lg leading-headline-lg tracking-headline-lg font-(weight:--font-weight-headline-lg) text-on-surface">Ask about {poolSize} candidates</h2>
      <p className="text-body-md leading-body-md text-on-surface-variant">
        Answers come only from the CVs in the pool and name the CVs they came from.
      </p>
      <ul aria-label="Suggested questions" className="mt-4 flex flex-wrap justify-center gap-2">
        {suggestions.map((question) => (
          <li key={question}>
            <Button onClick={() => onAsk(question)}>{question}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
