import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Select } from ".";

export default {
  title: "UI / Select",
  decorators: [
    (Story) => (
      <div className="pb-32">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "pear", label: "Pear" },
  { value: "plum", label: "Plum" },
];

export const Basic = () => {
  const [value, setValue] = useState("apple");
  return (
    <Select.Root value={value} onChange={setValue}>
      <Select.Trigger aria-label={`Fruit: ${value}`}>
        <Select.ValueText>{fruits.find((f) => f.value === value)?.label}</Select.ValueText>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Content>
        {fruits.map((fruit) => (
          <Select.Item key={fruit.value} value={fruit.value}>
            <Select.ItemText>{fruit.label}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};

export const Disabled = () => (
  <Select.Root value="apple" onChange={() => {}} disabled>
    <Select.Trigger aria-label="Fruit: apple">
      <Select.ValueText>Apple</Select.ValueText>
      <Select.Indicator />
    </Select.Trigger>
  </Select.Root>
);
