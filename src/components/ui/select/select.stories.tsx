import type { Meta } from "@storybook/nextjs-vite";
import { useState } from "react";
import { VendorLogo } from "@/components/ui/vendor-logo";
import { Select } from ".";

export default {
  title: "Components / Select",
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

const models = [
  { value: "primary", label: "Nemotron 3 Super", vendor: "nvidia" },
  { value: "alternative", label: "Gemini 3.6 Flash", vendor: "google" },
] as const;

/** Options with a leading logo, as in the composer's model chip. */
export const WithIcons = () => {
  const [value, setValue] = useState<string>("primary");
  const selected = models.find((m) => m.value === value);
  return (
    <Select.Root value={value} onChange={setValue}>
      <Select.Trigger aria-label={`Model: ${selected?.label}`}>
        {selected && <VendorLogo vendor={selected.vendor} />}
        <Select.ValueText>{selected?.label}</Select.ValueText>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Content>
        {models.map((model) => (
          <Select.Item key={model.value} value={model.value}>
            <VendorLogo vendor={model.vendor} />
            <Select.ItemText>{model.label}</Select.ItemText>
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
