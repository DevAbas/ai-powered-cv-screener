import { ColorItem, ColorPalette, Typeset } from "@storybook/addon-docs/blocks";
import type { Decorator, Meta } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import { convert, ThemeProvider, themes } from "storybook/theming";
import palette from "../../tokens/foundation/colors.tokens.json";
import motion from "../../tokens/foundation/motion.tokens.json";
import typography from "../../tokens/semantic/typography.tokens.json";
import radius from "../../tokens/semantic/radius.tokens.json";
import spacing from "../../tokens/semantic/spacing.tokens.json";
import light from "../../tokens/themes/light.tokens.json";
import dark from "../../tokens/themes/dark.tokens.json";
import { PlaygroundTable } from "../../.storybook/playground-table";

// The design tokens as the team sees them: read from tokens/ (W3C Design
// Tokens, the source of truth for every value), so this page cannot disagree
// with the page it documents. Role swatches show the live `--color-*`
// variable, so the theme toolbar switches them between light and dark.

/**
 * The doc blocks (ColorPalette, ColorItem, Typeset) read Storybook's own UI
 * theme, which a Docs page provides and a story canvas does not: this gives
 * them the one matching the theme toolbar (addon-themes' `theme` global).
 */
const withDocsTheme: Decorator = (Story, context) => (
  <ThemeProvider theme={convert(context.globals.theme === "dark" ? themes.dark : themes.light)}>
    <Story />
  </ThemeProvider>
);

export default {
  title: "Foundations / Tokens",
  decorators: [withDocsTheme],
} satisfies Meta;

/** The tokens of a DTCG group, without its `$` properties. */
const tokensOf = <T,>(group: Record<string, unknown>) => Object.entries(group).filter(([name]) => !name.startsWith("$")) as [string, T][];

type ColorToken = { $value: { hex: string } };
type AliasToken = { $value: string | { hex: string }; $description?: string };

/** The palette, one row per scale (`mint`, `gray-dark`, …) and one for the named values beside them. */
export const Palette = () => {
  const rows = new Map<string, Record<string, string>>();
  for (const [name, token] of tokensOf<ColorToken>(palette.palette)) {
    const step = /^(.*)-(\d+)$/.exec(name);
    const row = step ? step[1] : "named";
    rows.set(row, { ...rows.get(row), [step ? step[2] : name]: token.$value.hex });
  }
  return (
    <ColorPalette>
      {[...rows].map(([row, colors]) => (
        <ColorItem key={row} title={row} subtitle={row === "named" ? "Outside the scales" : "Radix steps 1–12"} colors={colors} />
      ))}
    </ColorPalette>
  );
};

/** What a role points to in one theme: the palette entry, or its derivation. */
const pointsTo = (token: AliasToken | undefined) => (typeof token?.$value === "string" ? token.$value.slice(1, -1) : (token?.$description ?? ""));

/** Every colour role, live in the current theme, with what it points to in each. */
export const Roles = () => (
  <ColorPalette>
    {tokensOf<AliasToken>(light.color).map(([role, token]) => (
      <ColorItem
        key={role}
        title={role}
        subtitle={`light ${pointsTo(token)} · dark ${pointsTo(Object.fromEntries(tokensOf<AliasToken>(dark.color))[role])}`}
        colors={{ [role]: `var(--color-${role})` }}
      />
    ))}
  </ColorPalette>
);

type TextToken = { $value: { fontFamily: string; fontSize: { value: number; unit: string }; fontWeight: string } };

/** Every text style, set in its own family, size and weight. */
export const TextStyles = () => (
  <div className="flex flex-col gap-4">
    {tokensOf<TextToken>(typography.typography).map(([name, token]) => (
      <div key={name}>
        <p className="text-label-sm text-on-surface-variant uppercase">{name}</p>
        <Typeset
          fontFamily={token.$value.fontFamily.includes("flex") ? "var(--font-display-light)" : "var(--font-sans)"}
          fontSizes={[`${token.$value.fontSize.value}${token.$value.fontSize.unit}`]}
          fontWeight={Number(token.$value.fontWeight.replace(/\D/g, ""))}
          sampleText="Find the right candidates"
        />
      </div>
    ))}
  </div>
);

type DimensionToken = { $value: { value: number; unit: string } };

function Sample({ name, value, children }: { name: string; value: string; children: ReactNode }) {
  return (
    <tr>
      <td>{name}</td>
      <td className="tabular-nums">{value}</td>
      <td>{children}</td>
    </tr>
  );
}

/** Radii, spacings and shadows, each drawn with its own variable. */
export const ShapeAndSpace = () => (
  <PlaygroundTable>
    <tbody>
      {tokensOf<DimensionToken>(radius.rounded).map(([name, token]) => (
        <Sample key={`radius-${name}`} name={`rounded.${name}`} value={`${token.$value.value}${token.$value.unit}`}>
          <div className="size-10 bg-primary-container" style={{ borderRadius: `var(--radius-${name})` }} />
        </Sample>
      ))}
      {tokensOf<DimensionToken>(spacing.spacing).map(([name, token]) => (
        <Sample key={`spacing-${name}`} name={`spacing.${name}`} value={`${token.$value.value}${token.$value.unit}`}>
          <div className="h-3 bg-primary" style={{ width: `var(--spacing-${name})` }} />
        </Sample>
      ))}
      {tokensOf<unknown>(light.shadow).map(([name]) => (
        <Sample key={`shadow-${name}`} name={`shadow.${name}`} value="light and dark opacities">
          <div className="size-10 rounded-md bg-surface-container-lowest" style={{ boxShadow: `var(--shadow-${name})` }} />
        </Sample>
      ))}
    </tbody>
  </PlaygroundTable>
);

type MotionToken = { $type: string; $value: number[] | { value: number; unit: string } };

/** Easings and durations, as the tokens state them. */
export const Motion = () => (
  <PlaygroundTable>
    <tbody>
      {tokensOf<MotionToken>(motion.motion).map(([name, token]) => (
        <tr key={name}>
          <td>{`motion.${name}`}</td>
          <td>{token.$type}</td>
          <td className="tabular-nums">{Array.isArray(token.$value) ? `cubic-bezier(${token.$value.join(", ")})` : `${token.$value.value}${token.$value.unit}`}</td>
        </tr>
      ))}
    </tbody>
  </PlaygroundTable>
);
