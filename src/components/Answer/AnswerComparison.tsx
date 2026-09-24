import type { Comparison } from "@/contracts/answer";
import { Table } from "@/components/ui/Table";
import { CandidateName } from "./CandidateName";
import type { SourceHref } from "./CvSourceLink";
import { CvSourceLink } from "./CvSourceLink";

export interface AnswerComparisonProps {
  comparison: Comparison;
  nameOf: (id: string) => string;
  sourceHref?: SourceHref | undefined;
}

/** Side-by-side of two candidates (PRD, Use cases: compare). */
export function AnswerComparison({ comparison, nameOf, sourceHref }: AnswerComparisonProps) {
  const [a, b] = comparison.candidateIds;
  const header = (id: string) => (
    <span className="flex flex-col items-start gap-1 normal-case">
      <CandidateName name={nameOf(id)} />
      <CvSourceLink candidateId={id} name={nameOf(id)} page={1} sourceHref={sourceHref} />
    </span>
  );
  return (
    <Table.Root>
      <Table.Caption>{`Comparison of ${nameOf(a)} and ${nameOf(b)}`}</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader>Criterion</Table.ColumnHeader>
          <Table.ColumnHeader>{header(a)}</Table.ColumnHeader>
          <Table.ColumnHeader>{header(b)}</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {comparison.rows.map((row) => (
          <Table.Row key={row.criterion}>
            <Table.RowHeader>{row.criterion}</Table.RowHeader>
            <Table.Cell>{row.a}</Table.Cell>
            <Table.Cell>{row.b}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
