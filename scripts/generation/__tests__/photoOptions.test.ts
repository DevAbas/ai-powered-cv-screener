import { describe, expect, it } from "vitest";
import type { ModelEntry } from "@/lib/models";
import { REGISTRY } from "@/lib/models";
import { FREE_NEURONS_PER_DAY, PHOTO_NEURONS, photoCostLine, photoPrompt, photoSeed } from "../photoOptions";

describe("photo options", () => {
  it("gives every candidate a stable seed of its own, in the models' range", () => {
    expect(photoSeed("lena-novak")).toBe(photoSeed("lena-novak"));
    expect(photoSeed("lena-novak")).not.toBe(photoSeed("jane-doe"));
    for (const id of ["lena-novak", "jane-doe", "a", ""]) {
      const seed = photoSeed(id);
      expect(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 31, id).toBe(true);
    }
  });

  it("ends the description with the style suffix", () => {
    expect(photoPrompt("A woman in her forties")).toMatch(/^A woman in her forties\. Neutral studio headshot/);
  });

  it("states the cost in neurons on Workers AI and in dollars elsewhere", () => {
    const image: ModelEntry = { ...REGISTRY.image, model: "@cf/leonardo/phoenix-1.0" };
    expect(photoCostLine(image, 30)).toContain(`${30 * PHOTO_NEURONS} of the ${FREE_NEURONS_PER_DAY}`);
    const google: ModelEntry = { ...REGISTRY.image, provider: "google", tier: "paid", model: "gemini-image" };
    expect(photoCostLine(google, 30)).toMatch(/about \$1\.02/);
  });
});
