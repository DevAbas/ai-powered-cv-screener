import { describe, expect, it } from "vitest";
import { reciprocalRankFusion, RRF_K } from "../rankFusion";

describe("reciprocalRankFusion", () => {
  it("scores 1/(k + rank) per list and puts items on both lists first", () => {
    const fused = reciprocalRankFusion([
      ["a", "b", "c"],
      ["c", "a", "d"],
    ]);
    expect(fused.map((f) => f.id)).toEqual(["a", "c", "b", "d"]);
    expect(fused[0]?.score).toBeCloseTo(1 / (RRF_K + 1) + 1 / (RRF_K + 2));
    expect(fused[3]?.score).toBeCloseTo(1 / (RRF_K + 3));
  });

  it("breaks ties by id and takes a custom k", () => {
    expect(reciprocalRankFusion([["b"], ["a"]]).map((f) => f.id)).toEqual(["a", "b"]);
    expect(reciprocalRankFusion([["a"]], 0)[0]?.score).toBe(1);
    expect(reciprocalRankFusion([])).toEqual([]);
  });
});
