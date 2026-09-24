import { describe, expect, it } from "vitest";
import { pineconeEnv } from "./env";

describe("pineconeEnv", () => {
  it("reads the key and defaults the index name", () => {
    expect(pineconeEnv({ PINECONE_API_KEY: "key" })).toEqual({ PINECONE_API_KEY: "key", PINECONE_INDEX: "cv-screener" });
  });

  it("says what to set when the key is missing or empty", () => {
    expect(() => pineconeEnv({})).toThrow("PINECONE_API_KEY is not set");
    expect(() => pineconeEnv({ PINECONE_API_KEY: "" })).toThrow("PINECONE_API_KEY is not set");
  });

  it("rejects an index name Pinecone would refuse", () => {
    expect(() => pineconeEnv({ PINECONE_API_KEY: "key", PINECONE_INDEX: "CV Screener" })).toThrow("PINECONE_INDEX");
  });
});
