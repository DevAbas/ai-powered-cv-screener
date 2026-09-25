import type { IndexEntry } from "@/contracts";
import { createEmbedder } from "@/lib/models/embedder";
import { getEntry } from "@/lib/models";
import { vocabularyOf } from "@/lib/candidates";
import { createBm25Index } from "@/lib/search";
import { pineconeStoreFromEnv } from "@/lib/search/pineconeStore";
import type { PineconeStore } from "@/lib/search/pineconeStore";
import type { AnswerDeps, AnswerPool } from "./questionAnswer";
import type { RequestLog } from "./requestLog";

// The composition root: the one place real adapters are wired to the
// answering service. Everything else receives them as AnswerDeps. The
// vocabulary and the BM25 index are built once per process from the pool.

let store: PineconeStore | undefined;
let pool: AnswerPool | undefined;

/** One JSON line per request on stdout. */
export const logRequest = (record: RequestLog): void => console.info(JSON.stringify(record));

/** The production collaborators. Throws when Pinecone is not configured. */
export function answerDeps(entries: readonly IndexEntry[]): AnswerDeps {
  const embedder = createEmbedder(getEntry("embed"));
  store ??= pineconeStoreFromEnv(embedder.dimensions);
  if (!pool || pool.entries !== entries) pool = { entries, vocabulary: vocabularyOf(entries), bm25: createBm25Index(entries) };
  return { pool, embedder, store, log: logRequest };
}
