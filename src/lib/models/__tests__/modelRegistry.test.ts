import { describe, expect, it } from "vitest";
import { getEntry, modelName } from "../modelEnv";
import { REGISTRY } from "../modelRegistry";

describe("model registry", () => {
  it("names every model from the environment, never from the code", () => {
    const env = { ANSWER_MODEL: "a", EMBEDDING_MODEL: "e", IMAGE_MODEL: "i" };
    expect(getEntry("primary", env).model).toBe("a");
    expect(getEntry("extract", env).model).toBe("a");
    expect(getEntry("generate", env).model).toBe("a");
    expect(getEntry("embed", env).model).toBe("e");
    expect(getEntry("image", env).model).toBe("i");
    expect(() => modelName("ANSWER_MODEL", {})).toThrow(/ANSWER_MODEL is not set/);
    expect(() => modelName("IMAGE_MODEL", { IMAGE_MODEL: " " })).toThrow(/IMAGE_MODEL is not set/);
  });

  it("answers with one slot that calls tools, on the Gemini API, with no fallback", () => {
    expect(Object.values(REGISTRY).filter((slot) => slot.capabilities.tools).map((slot) => slot.id)).toEqual(["primary"]);
    expect(REGISTRY.primary.provider).toBe("google");
    expect(REGISTRY.primary.fallback).toBeUndefined();
  });

  it("runs the scripts on the answer model with structured outputs, and embeds at 768 dimensions", () => {
    for (const id of ["extract", "generate"] as const) {
      expect(REGISTRY[id].modelVar).toBe(REGISTRY.primary.modelVar);
      expect(REGISTRY[id].capabilities.structuredOutput).toBe(true);
    }
    expect(REGISTRY.embed.capabilities.embedding).toBe(true);
    expect(REGISTRY.embed.dimensions).toBe(768);
  });
});
