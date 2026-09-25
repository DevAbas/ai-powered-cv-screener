import { describe, expect, it } from "vitest";
import { decodeImageResponse } from "../imageProviders";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("decodeImageResponse", () => {
  it("passes image bodies through as they are", () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(decodeImageResponse("image/jpeg", body)).toBe(body);
  });

  it("decodes the base64 image of a JSON body", () => {
    const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64");
    expect([...decodeImageResponse("application/json", bytes(JSON.stringify({ result: { image } })))]).toEqual([0xff, 0xd8, 0xff, 0xe0]);
  });

  it("fails plainly when the body holds no image", () => {
    expect(() => decodeImageResponse("application/json", bytes(JSON.stringify({ result: {} })))).toThrow(/no image/);
    expect(() => decodeImageResponse("text/html", bytes("<html>"))).toThrow(/unreadable/);
  });
});
