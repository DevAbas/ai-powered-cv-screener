import type { IndexEntry, Scope, Vocabulary } from "@/contracts";
import type { Embedder } from "@/lib/models/embedder";
import type { Bm25Index, VectorStore } from "@/lib/search";

export interface ToolDeps {
  entries: readonly IndexEntry[];
  vocabulary: Vocabulary;
  embedder: Embedder;
  store: VectorStore;
  bm25: Bm25Index;
  /** The candidates of the previous answer, the scope of a follow-up. */
  previousIds: readonly string[];
  signal?: AbortSignal;
}

export function scopeOf(scope: Scope, deps: ToolDeps): ReadonlySet<string> | undefined {
  if (scope === "whole_pool") return undefined;
  if (deps.previousIds.length === 0) throw new Error("There is no previous answer with candidates to narrow; search the whole pool instead.");
  return new Set(deps.previousIds);
}
