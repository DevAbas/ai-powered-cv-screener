import type { Meta } from "@storybook/nextjs-vite";
import { ArrowRight, RotateCw } from "lucide-react";
import { buttonRecipe } from "./Button.recipe";
import { PlaygroundTable } from "../../../../.storybook/playground-table";
import { Button } from "./Button";

export default {
  title: "UI / Button",
} satisfies Meta;

const variants = Object.keys(buttonRecipe.variants.variant) as (keyof typeof buttonRecipe.variants.variant)[];
const sizes = Object.keys(buttonRecipe.variants.size) as (keyof typeof buttonRecipe.variants.size)[];

export const Basic = () => <Button>Retry</Button>;

export const Variants = () => (
  <PlaygroundTable>
    <thead>
      <tr>
        <td />
        <td>enabled</td>
        <td>disabled</td>
      </tr>
    </thead>
    <tbody>
      {variants.map((variant) => (
        <tr key={variant}>
          <td>{variant}</td>
          <td>
            <Button variant={variant}>Ask</Button>
          </td>
          <td>
            <Button variant={variant} disabled>
              Ask
            </Button>
          </td>
        </tr>
      ))}
    </tbody>
  </PlaygroundTable>
);

export const Sizes = () => (
  <PlaygroundTable>
    <tbody>
      {sizes.map((size) => (
        <tr key={size}>
          <td>{size}</td>
          {variants.map((variant) => (
            <td key={variant}>
              <Button size={size} variant={variant}>
                Button
              </Button>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </PlaygroundTable>
);

export const WithIcons = () => (
  <div className="flex gap-3">
    <Button>
      <RotateCw aria-hidden /> Retry
    </Button>
    <Button variant="primary">
      Next <ArrowRight aria-hidden />
    </Button>
  </div>
);

export const Disabled = () => (
  <Button variant="primary" disabled>
    Ask
  </Button>
);
