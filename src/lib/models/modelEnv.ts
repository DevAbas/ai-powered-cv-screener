import type { ModelEntry, ModelId, ModelVar } from "./modelRegistry";
import { REGISTRY } from "./modelRegistry";

// The model names come from `.env.local`, never from the code, so a model
// is swapped without a commit (.env.example lists the variables). Read
// where a model is built, like the API keys (modelProviders.ts): a missing
// variable fails with the name to set.

type Env = Readonly<Record<string, string | undefined>>;

/** The model a variable names; throws with the variable to set. */
export function modelName(variable: ModelVar, env: Env = process.env): string {
  const value = env[variable]?.trim();
  if (!value) throw new Error(`${variable} is not set. Add it to .env.local (see .env.example).`);
  return value;
}

/** A registry slot with its model named from the environment. */
export function getEntry(id: ModelId, env: Env = process.env): ModelEntry {
  const slot = REGISTRY[id];
  return { ...slot, model: modelName(slot.modelVar, env) };
}
