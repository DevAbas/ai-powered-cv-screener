import type { Employment } from "@/contracts";

// Job stability (PRD, What the recruiter evaluates on): the median length of
// the candidate's jobs, derived from their dates.

function monthIndex(yearMonth: string): number {
  const [year, month] = yearMonth.split("-").map(Number);
  return year * 12 + month - 1;
}

/** "YYYY-MM" of a date, in UTC. */
export function yearMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Median months per job, counting both the first and last month. A current
 * job runs to `now` (the month of indexing). Null without jobs.
 */
export function medianTenureMonths(employment: readonly Employment[], now: string): number | null {
  const months = employment
    .map((job) => Math.max(1, monthIndex(job.to ?? now) - monthIndex(job.from) + 1))
    .sort((a, b) => a - b);
  if (months.length === 0) return null;
  const mid = Math.floor(months.length / 2);
  return months.length % 2 ? months[mid] : (months[mid - 1] + months[mid]) / 2;
}
