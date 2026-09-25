import { createGoogle } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { EmbeddingModel, LanguageModel } from "ai";
import type { ModelTarget, Provider } from "./modelRegistry";

// Builds SDK models from registry entries. Server and scripts only: reads
// API keys from the environment at call time. Model parameters follow each
// vendor's documentation: none are set here, so every model runs at its
// documented defaults (Gemini 3 keeps its default temperature, per the Gemini 3
// developer guide).

/** The environment variables each provider needs (.env.example). */
const KEY_ENV: Record<Provider, readonly string[]> = {
  openrouter: ["OPENROUTER_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  cloudflare: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
};

/** Env variables for the given providers that are not set. */
export function missingApiKeys(providers: Iterable<Provider>): string[] {
  return [...new Set(providers)].flatMap((p) => KEY_ENV[p]).filter((name) => !process.env[name]);
}

function envValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return value;
}

const SDK_KEY: Record<"openrouter" | "google", string> = { openrouter: "OPENROUTER_API_KEY", google: "GOOGLE_GENERATIVE_AI_API_KEY" };

function apiKey(provider: "openrouter" | "google"): string {
  return envValue(SDK_KEY[provider]);
}

/** The Workers AI account and token (Workers AI docs, REST API). */
export function cloudflareCredentials(): { accountId: string; token: string } {
  return { accountId: envValue("CLOUDFLARE_ACCOUNT_ID"), token: envValue("CLOUDFLARE_API_TOKEN") };
}

export function languageModel(target: ModelTarget): LanguageModel {
  switch (target.provider) {
    case "openrouter":
      // Usage accounting puts the upstream provider and the cost in providerMetadata.openrouter (provider README).
      return createOpenRouter({ apiKey: apiKey("openrouter") }).chat(target.model, { usage: { include: true } });
    case "google":
      return createGoogle({ apiKey: apiKey("google") })(target.model);
    case "cloudflare":
      throw new Error(`No language models on provider "cloudflare": it serves images (imageProviders.ts)`);
  }
}

/** An embedding model for a registry target; only Google serves one here. */
export function embeddingModel(target: ModelTarget): EmbeddingModel {
  if (target.provider !== "google") throw new Error(`No embedding models on provider "${target.provider}"`);
  return createGoogle({ apiKey: apiKey("google") }).embedding(target.model);
}
