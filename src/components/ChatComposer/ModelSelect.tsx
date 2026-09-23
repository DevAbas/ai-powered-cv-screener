import type { AnswerModelId } from "@/contracts/ask";
import { answerEntries } from "@/lib/ai/registry";
import type { ModelEntry } from "@/lib/ai/registry";
import { Select } from "@/components/ui/Select";
import { VendorLogo } from "@/components/ui/VendorLogo";

export interface ModelSelectProps {
  value: AnswerModelId;
  onChange: (id: AnswerModelId) => void;
  /** The answer models from the registry (PRD, Model selection). */
  entries?: readonly ModelEntry[];
  disabled?: boolean;
}

/** DESIGN.md, Model menu: vendor logo and model name, in the composer. */
export function ModelSelect({ value, onChange, entries = answerEntries(), disabled }: ModelSelectProps) {
  const selected = entries.find((entry) => entry.id === value);
  return (
    <Select.Root value={value} onChange={onChange} disabled={disabled}>
      <Select.Trigger aria-label={`Model: ${selected?.displayName ?? value}`}>
        {selected && <VendorLogo vendor={selected.vendor} />}
        <Select.ValueText>{selected?.displayName}</Select.ValueText>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Content anchor="top start">
        {entries.map((entry) => (
          <Select.Item key={entry.id} value={entry.id as AnswerModelId}>
            <VendorLogo vendor={entry.vendor} />
            <Select.ItemText>{entry.displayName}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
