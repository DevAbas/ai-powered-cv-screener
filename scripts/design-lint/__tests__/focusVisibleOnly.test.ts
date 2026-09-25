import { focusVisibleOnly } from "../rules/focusVisibleOnly.mjs";
import { COMPONENT, RECIPE, ruleTester } from "./ruleTester";

ruleTester.run("design/focus-visible-only", focusVisibleOnly, {
  valid: [
    { filename: COMPONENT, code: '<button className="outline-none focus-visible:ring-2 focus-visible:ring-primary-outline" />' },
    { filename: COMPONENT, code: '<div className="has-[textarea:focus-visible]:ring-2" />' },
    // Suppressing a ring is not drawing one.
    { filename: COMPONENT, code: '<a className="focus:outline-none focus-within:ring-0" />' },
    // Not a ring, outline, border or shadow.
    { filename: COMPONENT, code: '<a className="focus:text-primary-text" />' },
  ],
  invalid: [
    {
      filename: COMPONENT,
      code: '<button className="focus:ring-2 focus:ring-primary-outline" />',
      output: '<button className="focus-visible:ring-2 focus-visible:ring-primary-outline" />',
      errors: [{ messageId: "pointerFocus", data: { class: "focus:ring-2", variant: "focus" } }, { messageId: "pointerFocus" }],
    },
    {
      filename: COMPONENT,
      code: "<button className={`p-2 ${size} focus:outline-2`} />",
      output: "<button className={`p-2 ${size} focus-visible:outline-2`} />",
      errors: [{ messageId: "pointerFocus" }],
    },
    // A wrapper's focus-within needs a design choice, so no fix.
    { filename: COMPONENT, code: '<div className="focus-within:border-primary-outline" />', output: null, errors: [{ messageId: "pointerFocus", data: { class: "focus-within:border-primary-outline", variant: "focus-within" } }] },
    { filename: COMPONENT, code: '<div className="has-[input:focus]:shadow-raised" />', output: null, errors: [{ messageId: "pointerFocus" }] },
    { filename: RECIPE, code: 'export const r = defineRecipe({ base: "focus:ring-2" });', output: 'export const r = defineRecipe({ base: "focus-visible:ring-2" });', errors: [{ messageId: "pointerFocus" }] },
  ],
});
