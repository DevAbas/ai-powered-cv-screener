import type { AnswerModelId } from "@/contracts/ask";
import { ANSWER_MODEL_IDS } from "@/contracts/ask";

// The model registry (PLAN, Model registry). Pure data: no SDK imports and no env access,
// so the UI can import it. Model ids are pinned only after
// `npm run check-models` passes.

/** Routing provider: which SDK provider builds the model. */
export type Provider = "openrouter" | "google";

/** Model maker. UI logos resolve from `public/icons/providers/<vendor>.svg`. */
export type Vendor = "google" | "nvidia";

export type ModelId = AnswerModelId | "extract" | "generate" | "embed" | "image";

export type Tier = "free" | "paid";

export interface Capabilities {
  tools: boolean;
  structuredOutput: boolean;
  streaming: boolean;
  image: boolean;
  embedding: boolean;
}

export interface ModelTarget {
  provider: Provider;
  vendor: Vendor;
  model: string;
  /** Output dimensions for embedding models. */
  dimensions?: number;
}

export interface ModelEntry extends ModelTarget {
  id: ModelId;
  displayName: string;
  description: string;
  capabilities: Capabilities;
  tier: Tier;
  recommended?: boolean;
  /** Used when the primary fails after retries. Never set on `embed`. */
  fallback?: ModelTarget;
  /** `embed` only: may rebuild the whole index, never embed a single query. */
  rebuildFallback?: ModelTarget;
}

const ANSWER_CAPABILITIES: Capabilities = {
  tools: true,
  structuredOutput: true,
  streaming: true,
  image: false,
  embedding: false,
};

const GEMINI_FLASH: ModelTarget = {
  provider: "google",
  vendor: "google",
  model: "gemini-3.6-flash",
};

// Answer models enter the registry only when they meet the acceptance
// criteria in PLAN, Model registry. Descriptions state facts, never a quality ranking.
const primary: ModelEntry = {
  id: "primary",
  displayName: "Nemotron 3 Super",
  description: "NVIDIA Nemotron 3 Super on the OpenRouter free tier.",
  provider: "openrouter",
  vendor: "nvidia",
  model: "nvidia/nemotron-3-super-120b-a12b:free",
  capabilities: ANSWER_CAPABILITIES,
  tier: "free",
  // Provisional until the eval (PLAN, Evaluation) sets `recommended`.
  recommended: true,
  fallback: GEMINI_FLASH,
};

export const REGISTRY: Readonly<Record<ModelId, ModelEntry>> = {
  primary,
  // gemini-3.8-flash replaces 3.6 here once it passes the acceptance criteria (PLAN, Model registry).
  alternative: {
    id: "alternative",
    displayName: "Gemini 3.6 Flash",
    description: "Google Gemini 3.6 Flash on the Gemini API free tier.",
    ...GEMINI_FLASH,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
  },
  extract: {
    ...primary,
    id: "extract",
    description: "Extracts candidate profiles from CV text in the indexer.",
    capabilities: { ...ANSWER_CAPABILITIES, tools: false, streaming: false },
    recommended: undefined,
  },
  // Its own entry, so the indexer's model can change without touching generation.
  generate: {
    ...primary,
    id: "generate",
    description: "Generates synthetic candidate seeds in the generation pipeline.",
    capabilities: { ...ANSWER_CAPABILITIES, tools: false, streaming: false },
    recommended: undefined,
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
    capabilities: {
      tools: false,
      structuredOutput: false,
      streaming: false,
      image: true,
      embedding: false,
    },
    tier: "paid",
  },
  embed: {
    id: "embed",
    displayName: "Gemini Embedding 2",
    description: "Page embeddings for evidence retrieval.",
    provider: "google",
    vendor: "google",
    model: "gemini-embedding-2",
    dimensions: 256,
    capabilities: {
      tools: false,
      structuredOutput: false,
      streaming: false,
      image: false,
      embedding: true,
    },
    tier: "free",
    rebuildFallback: {
      provider: "openrouter",
      vendor: "nvidia",
      model: "nvidia/nemotron-3-embed-1b:free",
      // The only size this model accepts; a rebuilt index records its own dims.
      dimensions: 2048,
    },
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
