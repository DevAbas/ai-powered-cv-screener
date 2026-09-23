import { findCandidate } from "./pool";

/** Resolves a mock candidate id to its name, for stories and the mock screen. */
export function mockNameOf(id: string): string {
  return findCandidate(id)?.profile.name ?? id;
}
