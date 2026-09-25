import type { AskEvent } from "@/contracts/ask";
import { errorStatus, ModelTimeoutError } from "@/lib/ai/retry";
import { VectorStoreError } from "@/lib/vector/vector-store";
import { EmptyAnswerError, StepLimitError } from "./loop";
import { PresentationError, UnverifiedAnswerError } from "./views";

// The one place a failure becomes words for the recruiter: plain, and
// always worth another try. Details go to the log, never to the screen.

export function errorEvent(error: unknown): AskEvent {
  let message = "I couldn't answer that just now. Try again.";
  if (error instanceof VectorStoreError) message = "I couldn't search the CVs just now. Try again in a moment.";
  else if (error instanceof UnverifiedAnswerError) message = "I couldn't verify that answer against the CVs. Try again.";
  else if (error instanceof PresentationError) message = "I couldn't put that answer together. Try again, or ask it another way.";
  else if (error instanceof StepLimitError) message = "I couldn't finish that search. Try again, or ask it another way.";
  else if (error instanceof EmptyAnswerError) message = "The model gave no answer. Try again.";
  else if (error instanceof ModelTimeoutError || (error instanceof Error && /timeout|timed out/i.test(error.name + error.message))) message = "That took too long. Try again.";
  else if (errorStatus(error) === 402) message = "The model account has run out of credits.";
  else if (errorStatus(error) === 429) message = "I'm getting too many requests right now. Try again in a minute.";
  else if ((errorStatus(error) ?? 0) >= 500) message = "The model is busy right now. Try again in a moment.";
  return { type: "error", message, retryable: true };
}
