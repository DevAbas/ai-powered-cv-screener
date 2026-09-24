import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";
import type { CandidateSeed } from "@/contracts/candidate";
import { Ats, VARIANTS } from "./Ats";

// Three variants of one ATS-friendly layout, so formats differ without
// leaving the single-column shape recruiters' tools parse (PLAN, Generation pipeline).
export const TEMPLATE_COUNT = VARIANTS.length;

/** The template's `Document` for a seed, ready for `renderToBuffer`. */
export function renderTemplate(seed: CandidateSeed, photo: Buffer | undefined): ReactElement<DocumentProps> {
  const variant = VARIANTS[seed.template] ?? VARIANTS[0];
  // Ats returns a <CvDocument>, which is a react-pdf Document.
  return createElement(Ats, { seed, photo, variant }) as ReactElement<DocumentProps>;
}
