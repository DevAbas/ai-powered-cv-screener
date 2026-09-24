import type { AskEvent } from "@/contracts/ask";
import { errorStatus, ModelTimeoutError } from "@/lib/ai/retry";
import { StreamInterruptedError } from "@/lib/ai/stream-text";
import { VectorStoreError } from "@/lib/vector/vector-store";

// The one place a failure becomes words for the recruiter: plain, and always
// worth another try. Details go to the server log, never to the screen.

export function errorEvent(error: unknown): AskEvent {
  let message = "I couldn't answer that just now. Try again.";
  if (error instanceof VectorStoreError) message = "I couldn't search the CVs just now. Try again in a moment.";
  else if (error instanceof StreamInterruptedError) message = "The answer stopped part-way. Try again.";
  else if (error instanceof ModelTimeoutError) message = "That took too long. Try again.";
  else if (errorStatus(error) === 429) message = "I'm getting too many requests right now. Try again in a minute, or choose another model.";
  else if ((errorStatus(error) ?? 0) >= 500) message = "The model is busy right now. Try again in a moment.";
  return { type: "error", message, retryable: true };
}
