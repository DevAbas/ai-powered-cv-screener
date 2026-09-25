import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";
import type { CandidateSeed } from "@/contracts";
import { CvTemplate, VARIANTS } from "./CvTemplate";

// Three variants of one layout (font and date style), so formats differ
// without leaving the shape of the sample CV.
export const TEMPLATE_COUNT = VARIANTS.length;

/** The template's `Document` for a seed, ready for `renderToBuffer`. */
export function renderTemplate(seed: CandidateSeed, photo: Buffer | undefined): ReactElement<DocumentProps> {
  const variant = VARIANTS[seed.template] ?? VARIANTS[0];
  // CvTemplate returns a <CvDocument>, which is a react-pdf Document.
  return createElement(CvTemplate, { seed, photo, variant }) as ReactElement<DocumentProps>;
}
