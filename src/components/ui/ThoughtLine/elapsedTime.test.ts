import { describe, expect, it } from "vitest";
import { formatElapsed, spokenElapsed } from "./elapsedTime";

describe("formatElapsed", () => {
  it("shows tenths of a second, and minutes from sixty seconds", () => {
    expect(formatElapsed(0)).toBe("0.0s");
    expect(formatElapsed(42)).toBe("4.2s");
    expect(formatElapsed(635)).toBe("1m 3.5s");
  });
});

describe("spokenElapsed", () => {
  it("says the same in words", () => {
    expect(spokenElapsed(42)).toBe("4.2 seconds");
    expect(spokenElapsed(1205)).toBe("2 minutes 0.5 seconds");
  });
});
