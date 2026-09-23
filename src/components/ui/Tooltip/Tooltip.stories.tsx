import type { Meta } from "@storybook/nextjs-vite";
import { Copy } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { PlaygroundTable } from "../../../../.storybook/playground-table";
import { Tooltip } from "./Tooltip";
import { tooltipSlotRecipe } from "./Tooltip.recipe";

export default {
  title: "UI / Tooltip",
  decorators: [
    (Story) => (
      <div className="px-24 py-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

const sides = Object.keys(tooltipSlotRecipe.variants.side) as (keyof typeof tooltipSlotRecipe.variants.side)[];
const aligns = Object.keys(tooltipSlotRecipe.variants.align) as (keyof typeof tooltipSlotRecipe.variants.align)[];

/** Hover the button, or Tab to it. The label repeats the button's name, so the trigger props are left out. */
export const Basic = () => (
  <Tooltip content="Copy answer">
    {() => (
      <IconButton aria-label="Copy answer" variant="ghost" size="xs">
        <Copy aria-hidden />
      </IconButton>
    )}
  </Tooltip>
);

/** The tooltip adds information, so the trigger is described by it. */
export const Describing = () => (
  <Tooltip content="Runs on the free tier">
    {(trigger) => <Button {...trigger}>Nemotron 3 Super</Button>}
  </Tooltip>
);

export const Placements = () => (
  <PlaygroundTable>
    <tbody>
      {sides.map((side) => (
        <tr key={side}>
          <td>{side}</td>
          {aligns.map((align) => (
            <td key={align} className="px-10 py-12">
              <Tooltip content={`${side} ${align}`} side={side} align={align} defaultOpen>
                {() => (
                  <IconButton aria-label={`${side} ${align}`} variant="ghost" size="xs">
                    <Copy aria-hidden />
                  </IconButton>
                )}
              </Tooltip>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </PlaygroundTable>
);
