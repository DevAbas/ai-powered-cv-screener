import type { Comparison } from "@/contracts/answer";
import { Table } from "@/components/ui/table";
import type { OpenSource } from "./source-link";
import { SourceLink } from "./source-link";

export interface AnswerCompareProps {
  comparison: Comparison;
  nameOf: (id: string) => string;
  onOpenSource: OpenSource;
}

/** Side-by-side of two candidates (PRD, Use cases: compare). */
export function AnswerCompare({ comparison, nameOf, onOpenSource }: AnswerCompareProps) {
  const [a, b] = comparison.candidateIds;
  const header = (id: string) => (
    <SourceLink candidateId={id} name={nameOf(id)} page={1} onOpen={onOpenSource} />
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
