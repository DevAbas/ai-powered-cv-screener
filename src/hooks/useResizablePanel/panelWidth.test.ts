import { describe, expect, it } from "vitest";
import { clampPreviewWidth, defaultPreviewWidth, PREVIEW_MAX_SHARE, PREVIEW_MIN_WIDTH, widthFromPointer } from "./panelWidth";

describe("clampPreviewWidth", () => {
  it("keeps the width between the minimum and the viewport share", () => {
    expect(clampPreviewWidth(100, 1200)).toBe(PREVIEW_MIN_WIDTH);
    expect(clampPreviewWidth(500, 1200)).toBe(500);
    expect(clampPreviewWidth(2000, 1200)).toBe(Math.floor(1200 * PREVIEW_MAX_SHARE));
  });

  it("never asks for less than the minimum on a narrow viewport", () => {
    expect(clampPreviewWidth(500, 400)).toBe(PREVIEW_MIN_WIDTH);
  });
});

describe("defaultPreviewWidth", () => {
  it("opens at 30rem on a laptop and grows with the screen", () => {
    expect(defaultPreviewWidth(1280)).toBe(480);
    expect(defaultPreviewWidth(1600)).toBe(560);
    expect(defaultPreviewWidth(2000)).toBe(700);
  });

  it("stays within the clamp on a narrow viewport", () => {
    expect(defaultPreviewWidth(600)).toBe(Math.floor(600 * PREVIEW_MAX_SHARE));
  });
});

describe("widthFromPointer", () => {
  it("measures from the right edge", () => {
    expect(widthFromPointer(700, 1200)).toBe(500);
  });
});
