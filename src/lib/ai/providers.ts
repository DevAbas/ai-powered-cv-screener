import { createGoogle } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import type { EmbeddingModel, LanguageModel } from "ai";
import type { ModelTarget, Provider } from "./registry";

// Builds SDK models from registry entries. Server and scripts only: reads
// API keys from the environment at call time.

/** What the SDK needs to build a model; `vendor` is for display only. */
export type RoutedModel = Pick<ModelTarget, "provider" | "model" | "thinkingLevel">;

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
    case "google": {
      const model = createGoogle({ apiKey: apiKey("google") })(target.model);
      return target.thinkingLevel ? withThinkingLevel(model, target.thinkingLevel) : model;
    }
  }
}

type ThinkingLevel = NonNullable<ModelTarget["thinkingLevel"]>;

/** The model with a Google thinking level on every call, so call sites stay model-agnostic. */
export function withThinkingLevel(model: Parameters<typeof wrapLanguageModel>[0]["model"], thinkingLevel: ThinkingLevel): LanguageModel {
  const settings = { providerOptions: { google: { thinkingConfig: { thinkingLevel } } } };
  return wrapLanguageModel({ model, middleware: defaultSettingsMiddleware({ settings }) });
}

/** An embedding model for a registry target; only Google serves one here. */
export function embeddingModel(target: RoutedModel): EmbeddingModel {
  if (target.provider !== "google") throw new Error(`No embedding models on provider "${target.provider}"`);
  return createGoogle({ apiKey: apiKey("google") }).embedding(target.model);
}
