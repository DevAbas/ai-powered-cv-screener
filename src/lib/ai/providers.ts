import { createGoogle } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import type { ModelTarget, Provider } from "./registry";

// Builds SDK models from registry entries. Server and scripts only: reads
// API keys from the environment at call time.

/** What the SDK needs to build a model; `vendor` is for display only. */
export type RoutedModel = Pick<ModelTarget, "provider" | "model">;

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
