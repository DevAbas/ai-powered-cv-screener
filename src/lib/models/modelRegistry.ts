// The model registry. Pure data: no SDK imports and no env access. A slot
// says what the app asks of a model and which provider serves it. The
// model's name comes from `.env.local` (modelEnv.ts; the variables are in
// .env.example), never from the code, so a swap is a configuration change
// and not a commit.

/** Routing provider: which SDK provider builds the model. */
export type Provider = "openrouter" | "google";

export type ModelId = "primary" | "extract" | "generate" | "image" | "embed";

/** The variables in `.env.local` that name the models. */
export type ModelVar = "ANSWER_MODEL" | "EMBEDDING_MODEL" | "IMAGE_MODEL";

export type Tier = "free" | "paid";

/** What the app asks of a slot; the evaluation verifies the answer slot's capabilities. */
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

/** What the SDK routes to: a provider and the model it serves. */
export interface ModelTarget {
  provider: Provider;
  model: string;
}

/** A slot: everything about a model but its name. */
export interface ModelSlot {
  id: ModelId;
  description: string;
  provider: Provider;
  /** The variable that names the model. */
  modelVar: ModelVar;
  capabilities: Capabilities;
  tier: Tier;
  /** Used when the slot's model fails before the answer starts. No slot has one; the tests hand one in. */
  fallback?: ModelTarget;
  /** Length of the vectors the embedding model returns; the vector index is created with it. */
  dimensions?: number;
}

/** A slot with its model named from the environment: what the providers and the routing use. */
export interface ModelEntry extends ModelSlot {
  model: string;
}

const ANSWER_CAPABILITIES: Capabilities = { tools: true, streaming: true, structuredOutput: false, image: false, embedding: false };
const SCRIPT_CAPABILITIES: Capabilities = { tools: false, streaming: false, structuredOutput: true, image: false, embedding: false };

// Descriptions state facts, never a quality ranking.
export const REGISTRY: Readonly<Record<ModelId, ModelSlot>> = {
  // One model answers, without a fallback, and the recruiter does not choose it.
  primary: {
    id: "primary",
    description: "Answers the recruiter's questions on the Gemini API.",
    provider: "google",
    modelVar: "ANSWER_MODEL",
    capabilities: ANSWER_CAPABILITIES,
    tier: "free",
  },
  // The scripts use the answer model with structured outputs.
  extract: {
    id: "extract",
    description: "Extracts candidate profiles from CV text in the indexer.",
    provider: "google",
    modelVar: "ANSWER_MODEL",
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
  },
  generate: {
    id: "generate",
    description: "Generates synthetic candidate seeds in the generation pipeline.",
    provider: "google",
    modelVar: "ANSWER_MODEL",
    capabilities: SCRIPT_CAPABILITIES,
    tier: "free",
  },
  // No free image model exists on any provider. Paid, so it never runs by
  // default: only when named.
  image: {
    id: "image",
    description: "Candidate photos in the generation pipeline. Paid: runs only when named.",
    provider: "google",
    modelVar: "IMAGE_MODEL",
    capabilities: { tools: false, streaming: false, structuredOutput: false, image: true, embedding: false },
    tier: "paid",
  },
  // One vector per section chunk and per query, at 768 dimensions.
  embed: {
    id: "embed",
    description: "Embeds CV chunks and questions for similarity search.",
    provider: "google",
    modelVar: "EMBEDDING_MODEL",
    capabilities: { tools: false, streaming: false, structuredOutput: false, image: false, embedding: true },
    tier: "free",
    dimensions: 768,
  },
};
