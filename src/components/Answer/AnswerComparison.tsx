import type { AnswerView, ViewCandidate } from "@/contracts";
import { Table } from "@/components/ui/Table";
import { profileFacts } from "@/lib/conversation";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

type ComparisonView = Extract<AnswerView, { kind: "comparison" }>;

export interface AnswerComparisonProps {
  view: ComparisonView;
  sourceHref?: SourceHref | undefined;
}

interface Criterion {
  label: string;
  value: (candidate: ViewCandidate) => string;
}

const years = (value: number | null) => (value === null ? "—" : `${value} ${value === 1 ? "yr" : "yrs"}`);

/** The criteria in order, with the skills the question is about after seniority. */
function criteria(skills: readonly string[]): Criterion[] {
  return [
    { label: "Title", value: (c) => c.profile.headline },
    { label: "Location", value: (c) => c.profile.location },
    { label: "Seniority", value: (c) => profileFacts.seniority(c.profile) },
    ...skills.map((skill, i): Criterion => ({ label: skill, value: (c) => years(c.skills[i]?.years ?? null) })),
    { label: "Languages", value: (c) => profileFacts.languages(c.profile) },
    { label: "Education", value: (c) => profileFacts.education(c.profile) },
    { label: "Notice", value: (c) => profileFacts.notice(c.profile) },
    { label: "Work", value: (c) => `${profileFacts.work(c.profile)} · ${c.profile.workAuthorization}` },
  ];
}

/**
 * DESIGN.md, Answer views: Comparison. Two candidates side by side, every
 * fact from their CVs: one column each, headed by the name over the compact
 * file card, and the criteria down the first column.
 */
export function AnswerComparison({ view, sourceHref }: AnswerComparisonProps) {
  const [a, b] = view.candidates;
  return (
    <Table.Root>
      <Table.Caption>
        Comparison of {a?.profile.name} and {b?.profile.name}
      </Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>
            <span className="sr-only">Criterion</span>
          </Table.ColumnHeader>
          {view.candidates.map((c) => (
            <Table.ColumnHeader key={c.candidateId}>
              <span className="flex flex-col items-start gap-1.5 tracking-normal normal-case">
                <span className="text-label-lg text-on-surface">{c.profile.name}</span>
                <CvSourceLink compact candidateId={c.candidateId} name={c.profile.name} page={c.page} sourceHref={sourceHref} />
              </span>
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {criteria(view.skills).map((criterion) => (
          <Table.Row key={criterion.label}>
            <Table.RowHeader>{criterion.label}</Table.RowHeader>
            {view.candidates.map((c) => (
              <Table.Cell key={c.candidateId}>{criterion.value(c)}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
