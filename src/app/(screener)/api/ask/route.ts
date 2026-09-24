import type { AskEvent } from "@/contracts/ask";
import { AskRequestSchema } from "@/contracts/ask";
import type { AnswerDeps } from "@/lib/answering/answer-question";
import { answerQuestion } from "@/lib/answering/answer-question";
import { answerDeps } from "@/lib/answering/deps";
import { loadIndex } from "@/lib/pool/index-file";

// POST /api/ask (PLAN, Retrieval and answering): HTTP only. Validates the
// request, wires the answering service, and streams its events as NDJSON:
// progress, the answer text as it is written, then one answer or error.

export const runtime = "nodejs";

const NDJSON = { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" };

const line = (event: AskEvent) => `${JSON.stringify(event)}\n`;

/** A request that cannot be answered at all gets one error line, as the stream would end. */
function rejected(message: string, status: number, retryable: boolean): Response {
  return new Response(line({ type: "error", message, retryable }), { status, headers: NDJSON });
}

const log = (message: string) => console.info(`ask: ${message}`);

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((issue) => issue.path[0] === "question" && issue.code === "too_big");
    return rejected(tooLong ? "The question is too long. Shorten it and ask again." : "The question could not be sent.", 400, false);
  }

  let deps: AnswerDeps;
  try {
    deps = answerDeps(loadIndex(), log);
  } catch (error) {
    console.error("ask: not ready:", error);
    return rejected("The CV search isn't set up yet. Index the CVs and reload.", 503, false);
  }

  const encoder = new TextEncoder();
  // False once the client has gone: nothing more is written.
  let open = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      await answerQuestion(parsed.data, (event) => open && controller.enqueue(encoder.encode(line(event))), deps, request.signal);
      if (open) controller.close();
      open = false;
    },
    cancel() {
      open = false;
    },
  });
  return new Response(stream, { headers: NDJSON });
}
