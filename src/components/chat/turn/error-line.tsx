import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateLine } from "@/components/ui/state-line";

export interface ErrorLineProps {
  message: string;
  retryable: boolean;
  onRetry: () => void;
}

/** Plain-language error with a way to retry (PRD, States). */
export function ErrorLine({ message, retryable, onRetry }: ErrorLineProps) {
  return (
    <StateLine
      status="error"
      action={
        retryable && (
          <Button onClick={onRetry}>
            <RotateCw aria-hidden className="size-4" />
            Retry
          </Button>
        )
      }
    >
      {message}
    </StateLine>
  );
}
