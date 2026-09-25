import type { AnswerModelId } from "@/contracts/ask";
import { ANSWER_MODEL_IDS } from "@/contracts/ask";

// The model registry (PLAN, Model registry). Pure data: no SDK imports and
// no env access, so the UI can import it. Model ids come from the
// providers' model lists (the Gemini API's, OpenRouter's), never from
// memory. This phase runs one model without a fallback (PLAN, Answer
// models); the other entries stay here disabled for the next phase.
// `enabled` says whether an entry is offered or used.

/** Routing provider: which SDK provider builds the model. */
export type Provider = "openrouter" | "google";

/** Model maker. UI logos resolve from `public/icons/providers/<vendor>.svg`. */
export type Vendor = "google" | "nvidia" | "qwen";

export type ModelId = AnswerModelId | "gemini-flash" | "extract" | "generate" | "image" | "embed";

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

// This phase's one model: Gemini 3.5 Flash-Lite, pinned to its July 2026
// release (the Gemini API models list, 2026-09-25), not the moving
// `gemini-flash-lite-latest` alias, so answers do not change under a
// commit (PLAN, Answer models).
const GEMINI_FLASH_LITE: ModelTarget = { provider: "google", vendor: "google", model: "gemini-3.5-flash-lite" };

// Kept for the next phase, disabled: OpenRouter pay-as-you-go models with
// tool calling (OpenRouter's model list, 2026-09-25; the `:free` endpoints
// were dropped that day, PLAN, Environment), two vendors so a fallback does
// not share the primary's outage; and Gemini 3.6 Flash.
const NEMOTRON_SUPER: ModelTarget = { provider: "openrouter", vendor: "nvidia", model: "nvidia/nemotron-3-super-120b-a12b" };
const QWEN_27B: ModelTarget = { provider: "openrouter", vendor: "qwen", model: "qwen/qwen3.8-27b" };
const GEMINI_FLASH: ModelTarget = { provider: "google", vendor: "google", model: "gemini-3.6-flash" };

// Descriptions state facts, never a quality ranking.
export const REGISTRY: Readonly<Record<ModelId, ModelEntry>> = {
  primary: {
    id: "primary",
    displayName: "Gemini Flash-Lite",
    description: "Google Gemini 3.5 Flash-Lite on the Gemini API.",
    ...GEMINI_FLASH_LITE,
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
    enabled: true,
    recommended: true,
    // No fallback in this phase (PLAN, Answer models): one behaviour to tune for.
  },
  alternative: {
    id: "alternative",
    displayName: "Nemotron 3 Super",
    description: "NVIDIA Nemotron 3 Super on OpenRouter, pay-as-you-go.",
    ...NEMOTRON_SUPER,
    capabilities: ANSWER_CAPABILITIES,
    tier: "paid",
    enabled: false,
    fallback: QWEN_27B,
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
    displayName: "Gemini Flash-Lite",
    description: "Extracts candidate profiles from CV text in the indexer.",
    ...GEMINI_FLASH_LITE,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    enabled: true,
  },
  generate: {
    id: "generate",
    displayName: "Gemini Flash-Lite",
    description: "Generates synthetic candidate seeds in the generation pipeline.",
    ...GEMINI_FLASH_LITE,
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
    enabled: true,
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
