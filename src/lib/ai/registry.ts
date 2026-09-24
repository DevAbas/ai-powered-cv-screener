import type { AnswerModelId } from "@/contracts/ask";
import { ANSWER_MODEL_IDS } from "@/contracts/ask";

// The model registry (PLAN, Model registry). Pure data: no SDK imports and no env access,
// so the UI can import it. Model ids come from the provider's model list,
// never from memory.

/** Routing provider: which SDK provider builds the model. */
export type Provider = "openrouter" | "google";

/** Model maker. UI logos resolve from `public/icons/providers/<vendor>.svg`. */
export type Vendor = "google" | "openrouter";

export type ModelId = AnswerModelId | "extract" | "generate" | "image" | "embed";

export type Tier = "free" | "paid";

/** What the app asks of an entry. */
export interface Capabilities {
  /** Streams answers to the recruiter. */
  streaming: boolean;
  /** Fills a schema: the query rewrite (`primary`), profile extraction (`extract`) or seeds (`generate`). */
  structuredOutput: boolean;
  image: boolean;
  /** Turns text into vectors for similarity search. */
  embedding: boolean;
}

export interface ModelTarget {
  provider: Provider;
  vendor: Vendor;
  model: string;
  /** Google models only: how much the model thinks before its first word. Unset keeps the model's default. */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
}

export interface ModelEntry extends ModelTarget {
  id: ModelId;
  displayName: string;
  description: string;
  capabilities: Capabilities;
  tier: Tier;
  recommended?: boolean;
  /** Used when the primary fails after retries. */
  fallback?: ModelTarget;
  /** Length of the vectors an embedding entry returns; the vector index is created with it. */
  dimensions?: number;
}

const ANSWER_CAPABILITIES: Capabilities = {
  streaming: true,
  structuredOutput: false,
  image: false,
  embedding: false,
};

const GEMINI_FLASH: ModelTarget = {
  provider: "google",
  vendor: "google",
  model: "gemini-3.6-flash",
};

// Swapped in for speed and free-tier headroom (PLAN, Open questions 3).
const GEMINI_FLASH_LITE: ModelTarget = {
  provider: "google",
  vendor: "google",
  model: "gemini-flash-lite-latest",
};

/**
 * OpenRouter's free router: each question goes to any of its free models that is up. Another
 * provider, so a Google quota or overload does not take the answer down (PLAN, Answer models).
 */
const OPENROUTER_FREE: ModelTarget = {
  provider: "openrouter",
  vendor: "openrouter",
  model: "openrouter/free",
};

const SCRIPT_CAPABILITIES: Capabilities = { streaming: false, structuredOutput: true, image: false, embedding: false };

// Answer models enter the registry only when they meet the acceptance
// criteria in PLAN, Model registry. Descriptions state facts, never a quality ranking.
const primary: ModelEntry = {
  id: "primary",
  displayName: "Gemini Flash-Lite",
  description: "Google Gemini Flash-Lite (latest) on the Gemini API free tier.",
  ...GEMINI_FLASH_LITE,
  // Answering is reading comprehension over the retrieved CVs; with its default thinking, Flash-Lite
  // sat silent past the 10 s first-output limit on a 30-CV prompt (2026-09-24).
  thinkingLevel: "minimal",
  // It also rewrites follow-up fragments into search queries (lib/answering/deps.ts), whichever model answers.
  capabilities: { ...ANSWER_CAPABILITIES, structuredOutput: true },
  tier: "free",
  // Provisional until the eval (PLAN, Evaluation) sets `recommended`.
  recommended: true,
  fallback: OPENROUTER_FREE,
};

export const REGISTRY: Readonly<Record<ModelId, ModelEntry>> = {
  primary,
  // gemini-3.8-flash replaces 3.6 here once it passes the acceptance criteria (PLAN, Model registry).
  alternative: {
    id: "alternative",
    displayName: "Gemini 3.6 Flash",
    description: "Google Gemini 3.6 Flash on the Gemini API free tier.",
    ...GEMINI_FLASH,
    thinkingLevel: "minimal",
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
  },
  // Free models share one daily allowance per OpenRouter account (PLAN, Answer models).
  "openrouter-free": {
    id: "openrouter-free",
    displayName: "OpenRouter Free",
    description: "OpenRouter sends each question to any free model that is up, so the model can change between questions.",
    ...OPENROUTER_FREE,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
  },
  extract: {
    id: "extract",
    displayName: "Gemini Flash-Lite",
    description: "Extracts candidate profiles from CV text in the indexer.",
    ...GEMINI_FLASH_LITE,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    fallback: GEMINI_FLASH,
  },
  // Its own entry, so the indexer's model can change without touching generation.
  generate: {
    id: "generate",
    displayName: "Gemini Flash-Lite",
    description: "Generates synthetic candidate seeds in the generation pipeline.",
    ...GEMINI_FLASH_LITE,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    fallback: GEMINI_FLASH,
  },
  // No free image model exists on any provider (PLAN, Open questions, resolved
  // in 1.11). Paid, so it never runs by default: only when named.
  image: {
    id: "image",
    displayName: "Gemini 3.1 Flash-Lite Image",
    description: "Candidate photos in the generation pipeline. Paid: runs only when named.",
    provider: "google",
    vendor: "google",
    model: "gemini-3.1-flash-lite-image",
    capabilities: { streaming: false, structuredOutput: false, image: true, embedding: false },
    tier: "paid",
  },
  // One vector per CV and per question, for retrieval from the vector store
  // (PLAN, Retrieval and answering). The reference repo's model, at 768
  // dimensions to keep vectors small.
  embed: {
    id: "embed",
    displayName: "Gemini Embedding",
    description: "Embeds CV text and questions for similarity search.",
    provider: "google",
    vendor: "google",
    model: "gemini-embedding-001",
    capabilities: { streaming: false, structuredOutput: false, image: false, embedding: true },
    tier: "free",
    dimensions: 768,
  },
};

export function getEntry(id: ModelId): ModelEntry {
  return REGISTRY[id];
}

/** Entries the recruiter can choose in the composer (PRD, Model selection). */
export function answerEntries(): ModelEntry[] {
  return ANSWER_MODEL_IDS.map((id) => REGISTRY[id]);
}

export function recommendedEntry(): ModelEntry {
  const entry = answerEntries().find((e) => e.recommended);
  if (!entry) throw new Error("Registry has no recommended answer model");
  return entry;
}
