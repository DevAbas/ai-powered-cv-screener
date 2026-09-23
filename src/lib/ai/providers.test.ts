import { describe, expect, it } from "vitest";
import { queryEmbeddingTarget, rebuildEmbeddingTargets } from "./providers";
import { getEntry } from "./registry";

describe("queryEmbeddingTarget", () => {
  const embed = getEntry("embed");

  it("returns the model the index was built with", () => {
    expect(queryEmbeddingTarget({ model: embed.model, dims: 256 }).model).toBe(embed.model);
  });

  it("uses the rebuild fallback only when the index was rebuilt with it", () => {
    const rebuilt = embed.rebuildFallback!;
    expect(queryEmbeddingTarget({ model: rebuilt.model, dims: rebuilt.dimensions ?? 256 }).model).toBe(
      rebuilt.model,
    );
  });

  it("throws when the index model is not in the registry", () => {
    expect(() => queryEmbeddingTarget({ model: "some-other-model", dims: 256 })).toThrow(/Rebuild the index/);
  });

  it("throws when the index dimensions differ from the configured model", () => {
    expect(() => queryEmbeddingTarget({ model: embed.model, dims: 768 })).toThrow(/768 dimensions/);
  });
});

describe("rebuildEmbeddingTargets", () => {
  it("lists the primary before the rebuild-only fallback", () => {
    expect(rebuildEmbeddingTargets().map((t) => t.model)).toEqual([
      getEntry("embed").model,
      getEntry("embed").rebuildFallback!.model,
    ]);
  });
});
