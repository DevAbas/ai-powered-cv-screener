import { noHoverOnDisabled } from "../rules/noHoverOnDisabled.mjs";
import { COMPONENT, RECIPE, ruleTester } from "./ruleTester";

ruleTester.run("design/no-hover-on-disabled", noHoverOnDisabled, {
  valid: [
    { filename: COMPONENT, code: '<button className="enabled:hover:bg-surface-container-high enabled:active:bg-surface-container-highest disabled:text-on-surface-variant" />' },
    // A link has no disabled state; a menu row is not a control.
    { filename: COMPONENT, code: '<a className="hover:text-primary-text" />' },
    { filename: COMPONENT, code: '<li className="hover:bg-surface-container-low" />' },
    // group-hover is a different variant.
    { filename: COMPONENT, code: '<span className="group-hover:bg-outline-variant disabled:opacity-50" />' },
    { filename: RECIPE, code: 'export const r = defineRecipe({ base: ["cursor-pointer", "enabled:hover:bg-primary-hover", "disabled:bg-surface-container"] });' },
  ],
  invalid: [
    {
      filename: COMPONENT,
      code: '<button className="hover:bg-surface-container-high" />',
      output: '<button className="enabled:hover:bg-surface-container-high" />',
      errors: [{ messageId: "hoverOnDisabled", data: { class: "hover:bg-surface-container-high", variant: "hover" } }],
    },
    {
      filename: COMPONENT,
      code: '<IconButton className="active:bg-surface-container-high" />',
      output: '<IconButton className="enabled:active:bg-surface-container-high" />',
      errors: [{ messageId: "hoverOnDisabled", data: { class: "active:bg-surface-container-high", variant: "active" } }],
    },
    // The disabled: utility marks the group as one that can be disabled, across the strings of one recipe value.
    {
      filename: RECIPE,
      code: 'export const r = defineRecipe({ base: ["hover:bg-primary-hover", "disabled:bg-surface-container"] });',
      output: 'export const r = defineRecipe({ base: ["enabled:hover:bg-primary-hover", "disabled:bg-surface-container"] });',
      errors: [{ messageId: "hoverOnDisabled" }],
    },
    {
      filename: COMPONENT,
      code: '<div className="hover:bg-surface-container-low disabled:cursor-not-allowed" />',
      output: '<div className="enabled:hover:bg-surface-container-low disabled:cursor-not-allowed" />',
      errors: [{ messageId: "hoverOnDisabled" }],
    },
  ],
});
