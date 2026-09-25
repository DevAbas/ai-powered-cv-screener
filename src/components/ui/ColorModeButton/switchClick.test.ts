import { describe, expect, it } from "vitest";
import { playSwitchClick, switchClickRecipe } from "./switchClick";

describe("switchClickRecipe", () => {
  it("pitches on above off, in both the snap and the body", () => {
    const on = switchClickRecipe("on");
    const off = switchClickRecipe("off");
    expect(on.snapHz).toBeGreaterThan(off.snapHz);
    expect(on.bodyHz).toBeGreaterThan(off.bodyHz);
  });

  it("is a click: under 60 ms and quiet (DESIGN.md, Colour mode toggle)", () => {
    for (const direction of ["on", "off"] as const) {
      const recipe = switchClickRecipe(direction);
      expect(Math.max(recipe.decaySeconds, recipe.bodySeconds, recipe.snapSeconds)).toBeLessThan(0.06);
      expect(recipe.snapGain).toBeLessThanOrEqual(0.25);
      expect(recipe.bodyGain).toBeLessThanOrEqual(0.25);
    }
  });
});

describe("playSwitchClick", () => {
  it("does nothing without Web Audio", () => {
    expect(() => playSwitchClick("on")).not.toThrow();
  });
});
