import type { IndexEntry } from "@/contracts/candidate";
import { createEmbedder } from "@/lib/ai/embedder";
import { getEntry } from "@/lib/ai/registry";
import { vocabularyOf } from "@/lib/pool/vocabulary";
import { createBm25Index } from "@/lib/retrieval/bm25";
import { pineconeStoreFromEnv } from "@/lib/vector/pinecone";
import type { PineconeStore } from "@/lib/vector/pinecone";
import type { AnswerDeps, AnswerPool } from "./answer-question";
import type { RequestLog } from "./log";

// The composition root: the one place real adapters are wired to the
// answering service. Everything else receives them as AnswerDeps. The
// vocabulary and the BM25 index are built once per process from the pool.

let store: PineconeStore | undefined;
let pool: AnswerPool | undefined;

/** One JSON line per request on stdout (PLAN, Retrieval and answering: logging). */
export const logRequest = (record: RequestLog): void => console.info(JSON.stringify(record));

/** The production collaborators. Throws when Pinecone is not configured. */
export function answerDeps(entries: readonly IndexEntry[]): AnswerDeps {
  const embedder = createEmbedder(getEntry("embed"));
  store ??= pineconeStoreFromEnv(embedder.dimensions);
  if (!pool || pool.entries !== entries) pool = { entries, vocabulary: vocabularyOf(entries), bm25: createBm25Index(entries) };
  return { pool, embedder, store, log: logRequest };
}
