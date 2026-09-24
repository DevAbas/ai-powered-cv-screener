import type { AnswerModelId } from "@/contracts/ask";
import { AnswerModelIdSchema } from "@/contracts/ask";
import { answerEntry, recommendedEntry } from "@/lib/ai/registry";

// The selected model persists across reloads; the conversation does not
// (PLAN, User interface). Pure: the hook passes the browser's storage.

/** The storage key; the value is the registry entry's id. */
export const STORED_MODEL_KEY = "cv-screener.model";

/** A storage that may be missing or refuse (private mode, quota): every call is guarded. */
export type ModelStorage = Pick<Storage, "getItem" | "setItem">;

/** The stored model when it is still offered, else the recommended one. */
export function readStoredModel(storage: ModelStorage | undefined): AnswerModelId {
  const fallback = AnswerModelIdSchema.parse(recommendedEntry().id);
  try {
    const parsed = AnswerModelIdSchema.safeParse(storage?.getItem(STORED_MODEL_KEY));
    return parsed.success && answerEntry(parsed.data) ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredModel(storage: ModelStorage | undefined, model: AnswerModelId): void {
  try {
    storage?.setItem(STORED_MODEL_KEY, model);
  } catch {
    // Storage refused: the selection lasts for the session.
  }
}
