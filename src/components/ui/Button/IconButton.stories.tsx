import type { Meta } from "@storybook/nextjs-vite";
import { ArrowUp, Copy, Globe, Square } from "lucide-react";
import { buttonRecipe } from "./Button.recipe";
import { PlaygroundTable } from "../../../../.storybook/playground-table";
import { IconButton } from "./IconButton";

export default {
  title: "UI / IconButton",
} satisfies Meta;

const variants = Object.keys(buttonRecipe.variants.variant) as (keyof typeof buttonRecipe.variants.variant)[];
const sizes = Object.keys(buttonRecipe.variants.size) as (keyof typeof buttonRecipe.variants.size)[];

export const Basic = () => (
  <IconButton aria-label="Copy answer" variant="ghost">
    <Copy aria-hidden />
  </IconButton>
);

export const Variants = () => (
  <PlaygroundTable>
    <thead>
      <tr>
        <td />
        {sizes.map((size) => (
          <td key={size}>{size}</td>
        ))}
        <td>disabled</td>
      </tr>
    </thead>
    <tbody>
      {variants.map((variant) => (
        <tr key={variant}>
          <td>{variant}</td>
          {sizes.map((size) => (
            <td key={size}>
              <IconButton aria-label="Send" variant={variant} size={size}>
                <ArrowUp aria-hidden />
              </IconButton>
            </td>
          ))}
          <td>
            <IconButton aria-label="Send" variant={variant} disabled>
              <ArrowUp aria-hidden />
            </IconButton>
          </td>
        </tr>
      ))}
    </tbody>
  </PlaygroundTable>
);

/** The composer's send button and the Stop it becomes while a request runs. */
export const SendAndStop = () => (
  <div className="flex gap-3">
    <IconButton aria-label="Send" variant="primary" size="sm">
      <ArrowUp aria-hidden />
    </IconButton>
    <IconButton aria-label="Stop" variant="primary" size="sm">
      <Square aria-hidden className="size-4 fill-current" />
    </IconButton>
  </div>
);

export const Disabled = () => (
  <IconButton aria-label="Search the web" variant="ghost" size="sm" disabled>
    <Globe aria-hidden />
  </IconButton>
);
