import type { AskEvent, AskRequest } from "@/contracts";
import { AskEventSchema, AskRequestSchema } from "@/contracts";

// The screen's only data source: POST /api/ask, read
// as NDJSON. The mocks plug in as another transport (tests, previews).

/** Where events come from: raw values, validated here. */
export type AskTransport = (request: AskRequest, signal: AbortSignal) => AsyncIterable<unknown>;

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
 * Streams progress and answer text, then exactly one answer or error. The request is
 * validated first, so an over-long question is rejected here, as the API will. Every event is
 * validated against the contract; an invalid event, or a stream that ends
 * without an answer or error, becomes a retryable error. Aborting `signal`
 * rejects with its reason and nothing more is yielded.
 */
export async function* ask(
  request: AskRequest,
  signal: AbortSignal,
  transport: AskTransport = httpAsk,
): AsyncGenerator<AskEvent> {
  const checked = AskRequestSchema.safeParse(request);
  if (!checked.success) {
    const tooLong = checked.error.issues.some((issue) => issue.path[0] === "question" && issue.code === "too_big");
    yield rejectedRequest(tooLong);
    return;
  }
  for await (const raw of transport(request, signal)) {
    const parsed = AskEventSchema.safeParse(raw);
    if (!parsed.success) {
      yield UNREADABLE_ANSWER;
      return;
    }
    yield parsed.data;
    if (parsed.data.type === "answer" || parsed.data.type === "error") return;
  }
  yield UNREADABLE_ANSWER;
}

/** One parsed value per line of an NDJSON body; a line that is not JSON yields undefined (and fails validation). */
export async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parse = (line: string): unknown => {
    try {
      return JSON.parse(line);
    } catch {
      return undefined;
    }
  };
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) yield parse(line);
    }
    buffer += decoder.decode();
    if (buffer.trim()) yield parse(buffer);
  } finally {
    reader.releaseLock();
  }
}

/** POST /api/ask. A rejected request still answers with one NDJSON error line, so the body is read whatever the status. */
export async function* httpAsk(request: AskRequest, signal: AbortSignal): AsyncGenerator<unknown> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (response.body) yield* readNdjson(response.body);
}
