import type { AnswerView as View } from "@/contracts";
import { AnswerCandidates } from "./AnswerCandidates";
import { AnswerComparison } from "./AnswerComparison";
import { AnswerProfile } from "./AnswerProfile";
import type { SourceHref } from "./CvSourceLink";

export interface AnswerViewProps {
  view: View;
  sourceHref?: SourceHref | undefined;
}

/**
 * The data under an answer (DESIGN.md, Answer views), by kind. A state is not
 * drawn here: it wraps the answer's own words (`ChatExchange`).
 */
export function AnswerView({ view, sourceHref }: AnswerViewProps) {
  switch (view.kind) {
    case "list":
      return <AnswerCandidates view={view} sourceHref={sourceHref} />;
    case "comparison":
      return <AnswerComparison view={view} sourceHref={sourceHref} />;
    case "profile":
      return <AnswerProfile view={view} sourceHref={sourceHref} />;
    case "status":
      return null;
  }
}
