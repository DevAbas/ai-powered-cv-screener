import type { IndexEntry } from "@/contracts/candidate";
import { QueryPlanSchema } from "@/contracts/query";
import { createEmbedder } from "@/lib/ai/embedder";
import { getEntry } from "@/lib/ai/registry";
import { streamAnswerText } from "@/lib/ai/stream-text";
import { runStructured } from "@/lib/ai/structured";
import { pineconeStoreFromEnv } from "@/lib/vector/pinecone";
import type { PineconeStore } from "@/lib/vector/pinecone";
import type { AnswerDeps } from "./answer-question";
import { PLAN_BUDGET } from "./config";
import type { QueryPlanner } from "./plan";

// The composition root: the one place real adapters are wired to the
// answering service. Everything else receives them as AnswerDeps.

let store: PineconeStore | undefined;

/** Plans a question with the `primary` entry at temperature 0, as the reference repo does. */
const planQuery: QueryPlanner = async (prompt, signal) => {
  const { output } = await runStructured(
    getEntry("primary"),
    { schema: QueryPlanSchema, name: "query_plan", prompt, temperature: 0 },
    { signal, budget: PLAN_BUDGET },
  );
  return output;
};

/** The production collaborators; the vector store is created once per process. Throws when Pinecone is not configured. */
export function answerDeps(index: readonly IndexEntry[], log: (message: string) => void): AnswerDeps {
  const embedder = createEmbedder(getEntry("embed"));
  store ??= pineconeStoreFromEnv(embedder.dimensions);
  return { index, embedder, store, planQuery, streamAnswer: streamAnswerText, log };
}
