// Success and error counters per model (PLAN, Retrieval and answering:
// logging), for the process; they appear in every request's log line.

const counters = new Map<string, { success: number; error: number }>();

export function recordOutcome(model: string, ok: boolean): void {
  const entry = counters.get(model) ?? { success: 0, error: 0 };
  if (ok) entry.success += 1;
  else entry.error += 1;
  counters.set(model, entry);
}

export function counterSnapshot(): Record<string, { success: number; error: number }> {
  return Object.fromEntries([...counters].map(([model, entry]) => [model, { ...entry }]));
}

/** Tests only. */
export function resetCounters(): void {
  counters.clear();
}
