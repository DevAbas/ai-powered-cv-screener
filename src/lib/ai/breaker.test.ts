import { describe, expect, it } from "vitest";
import { CircuitBreaker } from "./breaker";

const MINUTE = 60_000;

function breakerAt(start = 0) {
  const clock = { now: start };
  const breaker = new CircuitBreaker({ now: () => clock.now });
  return { breaker, clock };
}

describe("CircuitBreaker", () => {
  it("opens after two failures within five minutes", () => {
    const { breaker, clock } = breakerAt();
    breaker.recordFailure("primary");
    expect(breaker.isOpen("primary")).toBe(false);
    clock.now += 4 * MINUTE;
    breaker.recordFailure("primary");
    expect(breaker.isOpen("primary")).toBe(true);
  });

  it("does not open when the failures are more than five minutes apart", () => {
    const { breaker, clock } = breakerAt();
    breaker.recordFailure("primary");
    clock.now += 5 * MINUTE + 1;
    breaker.recordFailure("primary");
    expect(breaker.isOpen("primary")).toBe(false);
  });

  it("stays open for the three-minute cooldown, then lets the primary try again", () => {
    const { breaker, clock } = breakerAt();
    breaker.recordFailure("primary");
    breaker.recordFailure("primary");
    clock.now += 3 * MINUTE - 1;
    expect(breaker.isOpen("primary")).toBe(true);
    clock.now += 1;
    expect(breaker.isOpen("primary")).toBe(false);
  });

  it("reopens on the first failure after the cooldown", () => {
    const { breaker, clock } = breakerAt();
    breaker.recordFailure("primary");
    breaker.recordFailure("primary");
    clock.now += 3 * MINUTE;
    expect(breaker.isOpen("primary")).toBe(false);
    breaker.recordFailure("primary");
    expect(breaker.isOpen("primary")).toBe(true);
  });

  it("closes on success after the cooldown", () => {
    const { breaker, clock } = breakerAt();
    breaker.recordFailure("primary");
    breaker.recordFailure("primary");
    clock.now += 3 * MINUTE;
    expect(breaker.isOpen("primary")).toBe(false);
    breaker.recordSuccess("primary");
    breaker.recordFailure("primary");
    expect(breaker.isOpen("primary")).toBe(false);
  });

  it("trip opens at once for the full cooldown", () => {
    const { breaker, clock } = breakerAt();
    breaker.trip("primary");
    expect(breaker.isOpen("primary")).toBe(true);
    clock.now += 3 * MINUTE;
    expect(breaker.isOpen("primary")).toBe(false);
  });

  it("keeps entries independent", () => {
    const { breaker } = breakerAt();
    breaker.recordFailure("primary");
    breaker.recordFailure("primary");
    expect(breaker.isOpen("alternative")).toBe(false);
  });
});
