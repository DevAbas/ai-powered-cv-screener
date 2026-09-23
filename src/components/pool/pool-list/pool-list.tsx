import { Eye } from "lucide-react";
import type { PoolCandidate } from "@/lib/pool/candidate";
import { List } from "@/components/ui/list";

export interface PoolListProps {
  candidates: readonly PoolCandidate[];
  selectedId?: string;
  /** CVs the recruiter has opened this session (PRD, UX principles: context is not lost). */
  viewedIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
}

/** Every CV in the pool; any of them opens without asking a question (PRD, Pool). */
export function PoolList({ candidates, selectedId, viewedIds, onSelect }: PoolListProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-3 text-label-sm leading-label-sm tracking-label-sm font-(weight:--font-weight-label-sm) text-on-surface-variant uppercase">Pool · {candidates.length} CVs</h2>
      <List.Root aria-label="Candidates">
        {candidates.map((c) => (
          <List.Item key={c.id}>
            <List.ItemTrigger current={c.id === selectedId} onClick={() => onSelect(c.id)}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{c.profile.name}</span>
              <span className="truncate text-body-sm leading-body-sm text-on-surface-variant">
                {c.profile.headline} · {c.profile.location}
              </span>
            </span>
            {viewedIds.has(c.id) && (
              <>
                <Eye aria-hidden className="size-4 shrink-0 text-on-surface-variant" />
                <span className="sr-only">Viewed</span>
              </>
            )}
            </List.ItemTrigger>
          </List.Item>
        ))}
      </List.Root>
    </section>
  );
}
