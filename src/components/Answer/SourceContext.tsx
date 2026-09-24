"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** A cited CV: which candidate's, and the page the evidence is on. */
export interface CvSource {
  candidateId: string;
  name: string;
  page: number;
}

const OpenSourceContext = createContext<((source: CvSource) => void) | null>(null);

/** Inside this, a source card opens the CV in the app's preview instead of a new tab. */
export function OpenSourceProvider({ onOpen, children }: { onOpen: (source: CvSource) => void; children: ReactNode }) {
  return <OpenSourceContext.Provider value={onOpen}>{children}</OpenSourceContext.Provider>;
}

export function useOpenSource(): ((source: CvSource) => void) | null {
  return useContext(OpenSourceContext);
}
