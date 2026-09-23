import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  poolSize: number;
  suggestions: readonly string[];
  onAsk: (question: string) => void;
}

/** Entry: pool size and suggested questions, never a blank screen (PRD, Core flow). */
export function EmptyState({ poolSize, suggestions, onAsk }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className="text-headline-lg leading-headline-lg tracking-headline-lg font-(weight:--font-weight-headline-lg) text-on-surface">Ask about {poolSize} candidates</h1>
      <p className="text-body-md leading-body-md text-on-surface-variant">
        Answers come only from the CVs in the pool, with a source you can open.
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
