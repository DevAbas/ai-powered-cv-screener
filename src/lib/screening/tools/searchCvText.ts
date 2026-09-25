import type { Filters, Scope } from "@/contracts";
import type { HybridHit } from "@/lib/search";
import { hybridSearch } from "@/lib/search";
import { applyFilters } from "./candidateFilters";
import type { ToolDeps } from "./toolDependencies";
import { scopeOf } from "./toolDependencies";

export type SearchResult = HybridHit[];

export async function searchCvText(query: string, filters: Filters | undefined, scope: Scope, limit: number | undefined, deps: ToolDeps): Promise<SearchResult> {
  const inScope = scopeOf(scope, deps);
  const allowed = filters ? new Set(applyFilters(deps.entries, filters, inScope).map((m) => m.entry.id)) : inScope;
  return hybridSearch({ query, scope: allowed, limit, signal: deps.signal }, deps);
}
