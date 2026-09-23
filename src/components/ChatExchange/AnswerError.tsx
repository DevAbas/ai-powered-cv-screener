import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/StatusMessage";

export interface AnswerErrorProps {
  message: string;
  retryable: boolean;
  onRetry: () => void;
}

/** Plain-language error with a way to retry (PRD, States). */
export function AnswerError({ message, retryable, onRetry }: AnswerErrorProps) {
  return (
    <StatusMessage
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
    </StatusMessage>
  );
}
