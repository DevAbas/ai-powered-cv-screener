import type { Filters, Scope } from "@/contracts";
import { applyFilters } from "./candidateFilters";
import type { ToolDeps } from "./toolDependencies";
import { scopeOf } from "./toolDependencies";

export interface CountResult {
  count: number;
  total: number;
}

export function countCandidates(filters: Filters, scope: Scope, deps: ToolDeps): CountResult {
  return { count: applyFilters(deps.entries, filters, scopeOf(scope, deps)).length, total: deps.entries.length };
}
