import type { AnswerMatched } from "@/contracts";
import type { ToolResult } from "./tools/toolSet";

// What the tools returned during one request (PLAN, Retrieval and
// answering: presentation): the candidates any tool returned, the pages
// each was cited on, the exact count, and what the progress line says.

export class ResultStore {
  readonly results: ToolResult[] = [];
  private readonly pages = new Map<string, number[]>();
  /** Candidate ids in the order the tools returned them. */
  private readonly order: string[] = [];
  private count: { count: number; total: number } | undefined;
  private matched: { matched: number; total: number } | undefined;
  private read = 0;
  /** The last filter or count call, the one an opening sentence describes. */
  lastFilter: Extract<ToolResult, { tool: "find_candidates" | "count_candidates" }> | undefined;
  /** The last filter call: a plain list holds every candidate it matched. */
  lastFind: Extract<ToolResult, { tool: "find_candidates" }> | undefined;
  lastSearch: Extract<ToolResult, { tool: "search_cv_text" }> | undefined;

  /** @param previousCount the candidates of the previous answer, the size a follow-up narrows. */
  constructor(readonly previousCount = 0) {}

  add(result: ToolResult): void {
    this.results.push(result);
    const cite = (id: string, page: number) => {
      const pages = this.pages.get(id) ?? [];
      if (!pages.includes(page)) pages.push(page);
      this.pages.set(id, pages);
      if (!this.order.includes(id)) this.order.push(id);
    };
    switch (result.tool) {
      case "find_candidates":
        this.lastFilter = result;
        this.lastFind = result;
        this.matched = { matched: result.result.matched, total: this.scopeSize(result.input.scope, result.result.total) };
        for (const candidate of result.result.candidates) {
          if (candidate.evidence.length === 0) cite(candidate.id, 1);
          for (const evidence of candidate.evidence) cite(candidate.id, evidence.page);
        }
        break;
      case "count_candidates":
        this.lastFilter = result;
        this.count = { count: result.result.count, total: this.scopeSize(result.input.scope, result.result.total) };
        break;
      case "get_candidates":
        this.read += result.result.length;
        for (const candidate of result.result) {
          const pages = Object.values(candidate.sources).map((source) => source.page);
          for (const page of pages.length ? pages : [1]) cite(candidate.id, page);
        }
        break;
      case "search_cv_text":
        this.lastSearch = result;
        for (const hit of result.result) cite(hit.id, hit.page);
        break;
    }
  }

  /** What a filter searched: the pool, or the previous answer for a follow-up. */
  private scopeSize(scope: "whole_pool" | "previous_answer", poolSize: number): number {
    return scope === "previous_answer" ? this.previousCount : poolSize;
  }

  /** The candidates any tool returned, in order. */
  get knownIds(): readonly string[] {
    return this.order;
  }

  knows(id: string): boolean {
    return this.pages.has(id);
  }

  /** The pages the tools cited for a candidate, in order of citation. */
  citedPages(id: string): readonly number[] {
    return this.pages.get(id) ?? [];
  }

  /** The exact count, from `count_candidates`; undefined when it was not called. */
  get exactCount(): { count: number; total: number } | undefined {
    return this.count;
  }

  get toolsRan(): boolean {
    return this.results.length > 0;
  }

  /** What the progress line says once answered. */
  get summary(): AnswerMatched | null {
    if (this.matched) return { kind: "matched", count: this.matched.matched, total: this.matched.total };
    if (this.count) return { kind: "matched", count: this.count.count, total: this.count.total };
    if (this.read > 0) return { kind: "read", count: this.read, total: this.read };
    if (this.results.length > 0) return { kind: "matched", count: this.order.length, total: this.order.length };
    return null;
  }
}
