import { describe, expect, it } from "vitest";
import { recommendedEntry } from "@/lib/models";
import { readStoredModel, STORED_MODEL_KEY, writeStoredModel } from "./storedModel";

const memory = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial));
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => void map.set(key, value), map };
};

describe("stored model", () => {
  it("reads a stored, offered model, and the recommended one otherwise", () => {
    expect(readStoredModel(memory({ [STORED_MODEL_KEY]: "primary" }))).toBe("primary");
    // A stored model that is no longer offered (the alternative is disabled in this phase) gives way to the recommended one.
    expect(readStoredModel(memory({ [STORED_MODEL_KEY]: "alternative" }))).toBe(recommendedEntry().id);
    expect(readStoredModel(memory({ [STORED_MODEL_KEY]: "openrouter-free" }))).toBe(recommendedEntry().id);
    expect(readStoredModel(memory())).toBe(recommendedEntry().id);
    expect(readStoredModel(undefined)).toBe(recommendedEntry().id);
  });

  it("writes the selection, and survives a storage that refuses", () => {
    const storage = memory();
    writeStoredModel(storage, "alternative");
    expect(storage.map.get(STORED_MODEL_KEY)).toBe("alternative");
    const refusing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => writeStoredModel(refusing, "primary")).not.toThrow();
    expect(readStoredModel(refusing)).toBe(recommendedEntry().id);
  });
});
