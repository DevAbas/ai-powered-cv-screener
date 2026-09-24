import type { Meta } from "@storybook/nextjs-vite";
import { Table } from ".";

export default {
  title: "UI / Table",
} satisfies Meta;

const rows = [
  { criterion: "Backend experience", a: "6 years, Go and PostgreSQL", b: "4 years, Java and Kafka" },
  { criterion: "Leadership", a: "Led a team of 4", b: "None stated" },
];

export const Basic = () => (
  <Table.Root>
    <Table.Caption>Comparison of Andrei Popescu and Elena Georgiou</Table.Caption>
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeader>Criterion</Table.ColumnHeader>
        <Table.ColumnHeader>Andrei Popescu</Table.ColumnHeader>
        <Table.ColumnHeader>Elena Georgiou</Table.ColumnHeader>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {rows.map((row) => (
        <Table.Row key={row.criterion}>
          <Table.RowHeader>{row.criterion}</Table.RowHeader>
          <Table.Cell>{row.a}</Table.Cell>
          <Table.Cell>{row.b}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>
);
