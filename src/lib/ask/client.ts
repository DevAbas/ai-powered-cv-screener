import type { AskEvent, AskRequest } from "@/contracts/ask";
import { AskEventSchema, AskRequestSchema } from "@/contracts/ask";
import { mockAsk } from "@/mocks/ask";

// The screen's only data source (PLAN, User interface). Backed by the mocks
// in the UI phase; the API phase replaces the source with POST /api/ask and
// keeps this contract.

/** What the recruiter sees when a response cannot be used. */
export const UNREADABLE_ANSWER: AskEvent = {
  type: "error",
  message: "The answer could not be read. Try again.",
  retryable: true,
};

/** The request breaks the contract; asking again unchanged would fail the same way. */
function rejectedRequest(tooLong: boolean): AskEvent {
  return {
    type: "error",
    message: tooLong ? "The question is too long. Shorten it and ask again." : "The question could not be sent.",
    retryable: false,
  };
}

/**
 * Streams progress events, then exactly one answer or error. The request is
 * validated first, so an over-long question is rejected here, as the API will. Every event is
 * validated against the contract; an invalid event, or a stream that ends
 * without an answer or error, becomes a retryable error. Aborting `signal`
 * rejects with its reason and nothing more is yielded.
 */
export async function* ask(request: AskRequest, signal: AbortSignal): AsyncGenerator<AskEvent> {
  const checked = AskRequestSchema.safeParse(request);
  if (!checked.success) {
    const tooLong = checked.error.issues.some((issue) => issue.path[0] === "question" && issue.code === "too_big");
    yield rejectedRequest(tooLong);
    return;
  }
  for await (const raw of mockAsk(request, signal)) {
    const parsed = AskEventSchema.safeParse(raw);
    if (!parsed.success) {
      yield UNREADABLE_ANSWER;
      return;
    }
    yield parsed.data;
    if (parsed.data.type !== "progress") return;
  }
  yield UNREADABLE_ANSWER;
}
