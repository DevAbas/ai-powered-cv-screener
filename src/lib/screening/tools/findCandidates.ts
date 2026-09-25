import type { Filters, Scope } from "@/contracts";
import type { Evidence } from "./candidateFilters";
import { applyFilters } from "./candidateFilters";
import type { ToolDeps } from "./toolDependencies";
import { scopeOf } from "./toolDependencies";

export interface FoundCandidate {
  id: string;
  name: string;
  headline: string;
  evidence: Evidence[];
}

export interface FindResult {
  matched: number;
  total: number;
  candidates: FoundCandidate[];
}

export function findCandidates(filters: Filters, scope: Scope, deps: ToolDeps): FindResult {
  const matches = applyFilters(deps.entries, filters, scopeOf(scope, deps));
  return {
    matched: matches.length,
    total: deps.entries.length,
    candidates: matches.map(({ entry, evidence }) => ({ id: entry.id, name: entry.profile.name, headline: entry.profile.headline, evidence })),
  };
}
