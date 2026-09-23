import type { Meta } from "@storybook/nextjs-vite";
import { Eye } from "lucide-react";
import { List } from ".";

export default {
  title: "Components / List",
} satisfies Meta;

const items = [
  { id: "lena", name: "Lena Novak", meta: "Senior Frontend Engineer · Berlin" },
  { id: "ali", name: "Ali Hasanov", meta: "Senior Backend Engineer · Baku" },
  { id: "nigar", name: "Nigar Mammadova", meta: "Backend Engineer · Baku" },
];

export const Basic = () => (
  <List.Root aria-label="Candidates">
    {items.map((item) => (
      <List.Item key={item.id}>
        <List.ItemTrigger>{item.name}</List.ItemTrigger>
      </List.Item>
    ))}
  </List.Root>
);

/** The current row is the one whose CV is open. */
export const WithCurrent = () => (
  <List.Root aria-label="Candidates">
    {items.map((item) => (
      <List.Item key={item.id}>
        <List.ItemTrigger current={item.id === "ali"}>{item.name}</List.ItemTrigger>
      </List.Item>
    ))}
  </List.Root>
);

export const WithSecondaryLine = () => (
  <List.Root aria-label="Candidates">
    {items.map((item) => (
      <List.Item key={item.id}>
        <List.ItemTrigger current={item.id === "lena"}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{item.name}</span>
            <span className="truncate text-body-sm leading-body-sm text-on-surface-variant">{item.meta}</span>
          </span>
          {item.id !== "nigar" && <Eye aria-label="Viewed" className="size-4 shrink-0 text-on-surface-variant" />}
        </List.ItemTrigger>
      </List.Item>
    ))}
  </List.Root>
);
