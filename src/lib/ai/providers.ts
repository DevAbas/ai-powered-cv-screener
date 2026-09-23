import { createGoogle } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import type { EmbeddingIndex } from "@/contracts/candidate";
import type { ModelEntry, ModelTarget, Provider } from "./registry";
import { getEntry } from "./registry";

// Builds SDK models from registry entries. Server and scripts only: reads
// API keys from the environment at call time.

/** What the SDK needs to build a model; `vendor` is for display only. */
export type RoutedModel = Pick<ModelTarget, "provider" | "model" | "dimensions">;

const KEY_ENV: Record<Provider, string> = {
  openrouter: "OPENROUTER_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/** Env variables for the given providers that are not set. */
export function missingApiKeys(providers: Iterable<Provider>): string[] {
  return [...new Set(providers)].map((p) => KEY_ENV[p]).filter((name) => !process.env[name]);
}

function apiKey(provider: Provider): string {
  const name = KEY_ENV[provider];
  const key = process.env[name];
  if (!key) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return key;
}

export function languageModel(target: RoutedModel): LanguageModel {
  switch (target.provider) {
    case "openrouter":
      return createOpenRouter({ apiKey: apiKey("openrouter") }).chat(target.model);
    case "google":
      return createGoogle({ apiKey: apiKey("google") })(target.model);
  }
}

export function embeddingModel(target: RoutedModel): EmbeddingModel {
  switch (target.provider) {
    case "openrouter":
      return createOpenRouter({ apiKey: apiKey("openrouter") }).textEmbeddingModel(target.model, {
        extraBody: target.dimensions ? { dimensions: target.dimensions } : undefined,
      });
    case "google":
      return createGoogle({ apiKey: apiKey("google") }).embedding(target.model);
  }
}

export type EmbeddingTask = "document" | "query";

/**
 * Per-call provider options for an embedding target. Google takes the output
 * size here; OpenRouter takes it in the model settings (`embeddingModel`).
 */
export function embeddingProviderOptions(target: RoutedModel, task: EmbeddingTask) {
  if (target.provider !== "google") return undefined;
  return {
    google: {
      outputDimensionality: target.dimensions,
      taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
    },
  };
}

/**
 * The embedding target for a single query. There is no fallback at query
 * time: the query is embedded with exactly the model the index was built
 * with, or not at all (PLAN, Model registry: Embeddings).
 */
export function queryEmbeddingTarget(index: Pick<EmbeddingIndex, "model" | "dims">): ModelTarget {
  const entry = getEntry("embed");
  const candidates = [entry, entry.rebuildFallback].filter((t): t is ModelTarget => t !== undefined);
  const target = candidates.find((t) => t.model === index.model);
  if (!target) {
    throw new Error(
      `Embedding index was built with "${index.model}", which is not in the registry. Rebuild the index.`,
    );
  }
  if (target.dimensions !== undefined && target.dimensions !== index.dims) {
    throw new Error(
      `Embedding index has ${index.dims} dimensions but "${target.model}" is configured for ${target.dimensions}. Rebuild the index.`,
    );
  }
  return target;
}

/** Targets an index rebuild may use, in order: primary, then the rebuild-only fallback. */
export function rebuildEmbeddingTargets(): ModelTarget[] {
  const entry: ModelEntry = getEntry("embed");
  return entry.rebuildFallback ? [entry, entry.rebuildFallback] : [entry];
}
