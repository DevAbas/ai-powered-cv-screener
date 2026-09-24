import type { AnswerModelId } from "@/contracts/ask";
import { ANSWER_MODEL_IDS } from "@/contracts/ask";

// The model registry (PLAN, Model registry). Pure data: no SDK imports and
// no env access, so the UI can import it. Model ids come from the
// provider's model list (OpenRouter, models that support tools), never from
// memory. The answer entries are provisional until the evaluation (PLAN,
// Evaluation) confirms them: `enabled` says whether an entry is offered.

/** Routing provider: which SDK provider builds the model. */
export type Provider = "openrouter" | "google";

/** Model maker. UI logos resolve from `public/icons/providers/<vendor>.svg`. */
export type Vendor = "google" | "nvidia" | "qwen";

export type ModelId = AnswerModelId | "gemini-flash-lite" | "gemini-flash" | "extract" | "generate" | "image" | "embed";

export type Tier = "free" | "paid";

/** What the app asks of an entry; the evaluation verifies the answer entries' capabilities. */
export interface Capabilities {
  /** Calls the answer tools and the presentation call. */
  tools: boolean;
  /** Streams answers to the recruiter. */
  streaming: boolean;
  /** Fills a schema: profile extraction (`extract`) or seeds (`generate`). */
  structuredOutput: boolean;
  image: boolean;
  /** Turns text into vectors for similarity search. */
  embedding: boolean;
}

export interface ModelTarget {
  provider: Provider;
  vendor: Vendor;
  model: string;
}

export interface ModelEntry extends ModelTarget {
  id: ModelId;
  displayName: string;
  description: string;
  capabilities: Capabilities;
  tier: Tier;
  /** Offered to the recruiter, or used by the scripts. A disabled entry stays here for later and is never used. */
  enabled: boolean;
  recommended?: boolean;
  /** Used when the entry's model fails before the answer starts (PLAN, Reliability). */
  fallback?: ModelTarget;
  /** Length of the vectors an embedding entry returns; the vector index is created with it. */
  dimensions?: number;
}

const ANSWER_CAPABILITIES: Capabilities = { tools: true, streaming: true, structuredOutput: false, image: false, embedding: false };
const SCRIPT_CAPABILITIES: Capabilities = { tools: false, streaming: false, structuredOutput: true, image: false, embedding: false };

// Pinned free models with tool calling (OpenRouter's model list, 2026-09-24);
// two vendors, so the fallback does not share the primary's outage.
const NEMOTRON_SUPER: ModelTarget = { provider: "openrouter", vendor: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b:free" };
const QWEN_27B: ModelTarget = { provider: "openrouter", vendor: "qwen", model: "qwen/qwen3.8-27b:free" };

// Gemini answer models are kept for later: disabled, never a fallback, not evaluated in this phase (PLAN, Answer models).
const GEMINI_FLASH_LITE: ModelTarget = { provider: "google", vendor: "google", model: "gemini-flash-lite-latest" };
const GEMINI_FLASH: ModelTarget = { provider: "google", vendor: "google", model: "gemini-3.6-flash" };

// Descriptions state facts, never a quality ranking.
export const REGISTRY: Readonly<Record<ModelId, ModelEntry>> = {
  primary: {
    id: "primary",
    displayName: "Nemotron 3 Super",
    description: "NVIDIA Nemotron 3 Super on OpenRouter's free tier.",
    ...NEMOTRON_SUPER,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
    enabled: true,
    // Provisional until the evaluation sets `recommended` and confirms the fallback (PLAN, Evaluation).
    recommended: true,
    fallback: QWEN_27B,
  },
  alternative: {
    id: "alternative",
    displayName: "Qwen3.8 27B",
    description: "Qwen3.8 27B on OpenRouter's free tier.",
    ...QWEN_27B,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
    enabled: true,
  },
  "gemini-flash-lite": {
    id: "gemini-flash-lite",
    displayName: "Gemini Flash-Lite",
    description: "Google Gemini Flash-Lite (latest) on the Gemini API free tier.",
    ...GEMINI_FLASH_LITE,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
    enabled: false,
  },
  "gemini-flash": {
    id: "gemini-flash",
    displayName: "Gemini 3.6 Flash",
    description: "Google Gemini 3.6 Flash on the Gemini API free tier.",
    ...GEMINI_FLASH,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
    enabled: false,
  },
  // The scripts use the primary's model with structured outputs (PLAN, Answer models).
  extract: {
    id: "extract",
    displayName: "Nemotron 3 Super",
    description: "Extracts candidate profiles from CV text in the indexer.",
    ...NEMOTRON_SUPER,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    enabled: true,
    fallback: QWEN_27B,
  },
  generate: {
    id: "generate",
    displayName: "Nemotron 3 Super",
    description: "Generates synthetic candidate seeds in the generation pipeline.",
    ...NEMOTRON_SUPER,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    enabled: true,
    fallback: QWEN_27B,
  },
  // No free image model exists on any provider (PLAN, Generation pipeline). Paid, so it never runs by default: only when named.
  image: {
    id: "image",
    displayName: "Gemini 3.1 Flash-Lite Image",
    description: "Candidate photos in the generation pipeline. Paid: runs only when named.",
    provider: "google",
    vendor: "google",
    model: "gemini-3.1-flash-lite-image",
    capabilities: { tools: false, streaming: false, structuredOutput: false, image: true, embedding: false },
    tier: "paid",
    enabled: true,
  },
  // One vector per section chunk and per query (PLAN, Vector store), at 768 dimensions.
  embed: {
    id: "embed",
    displayName: "Gemini Embedding",
    description: "Embeds CV chunks and questions for similarity search.",
    provider: "google",
    vendor: "google",
    model: "gemini-embedding-001",
    capabilities: { tools: false, streaming: false, structuredOutput: false, image: false, embedding: true },
    tier: "free",
    enabled: true,
    dimensions: 768,
  },
};

export function getEntry(id: ModelId): ModelEntry {
  return REGISTRY[id];
}

/** Entries the recruiter can choose in the composer (PRD, Model selection): the enabled answer entries. */
export function answerEntries(): ModelEntry[] {
  return ANSWER_MODEL_IDS.map((id) => REGISTRY[id]).filter((entry) => entry.enabled);
}

/** The answer entry a request names, if it is offered. */
export function answerEntry(id: AnswerModelId): ModelEntry | undefined {
  const entry = REGISTRY[id];
  return entry.enabled ? entry : undefined;
}

export function recommendedEntry(): ModelEntry {
  const entry = answerEntries().find((e) => e.recommended);
  if (!entry) throw new Error("Registry has no recommended answer model");
  return entry;
}
