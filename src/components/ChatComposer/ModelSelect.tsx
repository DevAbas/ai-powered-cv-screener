import type { AnswerModelId } from "@/contracts";
import { answerEntries } from "@/lib/models";
import type { ModelEntry } from "@/lib/models";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { VendorLogo } from "@/components/ui/VendorLogo";

export interface ModelSelectProps {
  value: AnswerModelId;
  onChange: (id: AnswerModelId) => void;
  /** The answer models from the registry (PRD, Model selection). */
  entries?: readonly ModelEntry[];
  disabled?: boolean;
}

/** DESIGN.md, Model menu: vendor logo and model name, in the composer, with a "Change model" tooltip. */
export function ModelSelect({ value, onChange, entries = answerEntries(), disabled }: ModelSelectProps) {
  const selected = entries.find((entry) => entry.id === value);
  return (
    <Select.Root value={value} onChange={onChange} disabled={disabled}>
      {({ open }) => (
        <>
          {/* The menu opens above the chip, where the tooltip would sit: none while it is open. */}
          <Tooltip content="Change model" disabled={open}>
            {(trigger) => (
              <Select.Trigger {...trigger} aria-label={`Model: ${selected?.displayName ?? value}`}>
                {selected && <VendorLogo vendor={selected.vendor} />}
                <Select.ValueText>{selected?.displayName}</Select.ValueText>
                <Select.Indicator />
              </Select.Trigger>
            )}
          </Tooltip>
          <Select.Content anchor="top start">
            {entries.map((entry) => (
              <Select.Item key={entry.id} value={entry.id as AnswerModelId}>
                <VendorLogo vendor={entry.vendor} />
                <Select.ItemText>{entry.displayName}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </>
      )}
    </Select.Root>
  );
}
