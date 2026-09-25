import { APICallError } from "ai";
import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker } from "./breaker";
import type { ModelEntry, ModelTarget } from "./registry";
import { getEntry } from "./registry";
import { ModelTimeoutError } from "./retry";
import { modelKey, modelRoute, runRoute } from "./route";

const fallback: ModelTarget = { provider: "openrouter", vendor: "qwen", model: "vendor/fallback:free" };
const entry: ModelEntry = { ...getEntry("primary"), fallback };

const stall = new ModelTimeoutError("first-output", 10_000);
const busy = new APICallError({ message: "HTTP 503", url: "https://example.com", requestBodyValues: {}, statusCode: 503 });
const dailyQuota = new APICallError({
  message: "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day",
  url: "https://example.com",
  requestBodyValues: {},
  statusCode: 429,
});
const BAD_REQUEST = new Error("HTTP 400");

/** Runs the route with one outcome per model: text to return, or an error to throw. */
function route(breaker: CircuitBreaker, outcomes: { entry: string | Error; fallback?: string | Error }, signal = new AbortController().signal) {
  const run = vi.fn(async (target: ModelTarget) => {
    const outcome = target === entry ? outcomes.entry : outcomes.fallback;
    if (outcome === undefined) throw new Error(`unexpected call to ${target.model}`);
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  const onFailure = vi.fn();
  const result = runRoute(entry, { breaker, signal, run, canSwitch: (error) => error !== BAD_REQUEST, onFailure });
  return { result, run, onFailure };
}

describe("modelRoute", () => {
  it("tries the entry's model, then its fallback", () => {
    expect(modelRoute(entry, new CircuitBreaker())).toEqual([entry, fallback]);
  });

  it("skips a model with an open breaker for its fallback", () => {
    const breaker = new CircuitBreaker();
    breaker.trip(modelKey(entry));
    expect(modelRoute(entry, breaker)).toEqual([fallback]);
  });

  it("leaves out a fallback with an open breaker, so the model is always tried", () => {
    const breaker = new CircuitBreaker();
    breaker.trip(modelKey(entry));
    breaker.trip(modelKey(fallback));
    expect(modelRoute(entry, breaker)).toEqual([entry]);
  });

  it("has only the model for an entry without a fallback, whatever its breaker says", () => {
    const primary = getEntry("primary");
    const breaker = new CircuitBreaker();
    expect(modelRoute(primary, breaker)).toEqual([primary]);
    breaker.trip(`${primary.provider}:${primary.model}`);
    expect(modelRoute(primary, breaker)).toEqual([primary]);
  });
});

describe("runRoute", () => {
  it("returns the first model's answer", async () => {
    const { result, run } = route(new CircuitBreaker(), { entry: "Lena Novak." });
    await expect(result).resolves.toEqual({ value: "Lena Novak.", target: entry, fellBack: false });
    expect(run).toHaveBeenCalledOnce();
  });

  it("moves to the fallback after a failure, and reports it", async () => {
    const { result, run, onFailure } = route(new CircuitBreaker(), { entry: stall, fallback: "From the fallback." });
    await expect(result).resolves.toEqual({ value: "From the fallback.", target: fallback, fellBack: true });
    expect(onFailure).toHaveBeenCalledWith(stall, entry, fallback);
    // Each model is told what comes after it: the last one has nothing to hand over to.
    expect(run.mock.calls).toEqual([
      [entry, fallback],
      [fallback, undefined],
    ]);
  });

  it("throws the model's own failure when its fallback fails too, and passes over a spent fallback after that", async () => {
    // The failure seen live: Flash-Lite stalled, then Nemotron had used its free requests for the day.
    const breaker = new CircuitBreaker();
    const first = route(breaker, { entry: stall, fallback: dailyQuota });
    await expect(first.result).rejects.toBe(stall);
    expect(first.onFailure).toHaveBeenLastCalledWith(dailyQuota, fallback, undefined);
    expect(breaker.isOpen(modelKey(fallback))).toBe(true);

    const second = route(breaker, { entry: "Lena Novak." });
    await expect(second.result).resolves.toMatchObject({ target: entry, fellBack: false });
  });

  it("counts timeouts and 5xx against a model, not other failures", async () => {
    const breaker = new CircuitBreaker();
    await route(breaker, { entry: BAD_REQUEST }).result.catch(() => {});
    await route(breaker, { entry: BAD_REQUEST }).result.catch(() => {});
    expect(breaker.isOpen(modelKey(entry))).toBe(false);
    await route(breaker, { entry: busy, fallback: "ok" }).result;
    await route(breaker, { entry: stall, fallback: "ok" }).result;
    expect(breaker.isOpen(modelKey(entry))).toBe(true);
  });

  it("ends at once on a failure no other model can help with", async () => {
    const { result, run } = route(new CircuitBreaker(), { entry: BAD_REQUEST, fallback: "unused" });
    await expect(result).rejects.toBe(BAD_REQUEST);
    expect(run).toHaveBeenCalledOnce();
  });

  it("tries nothing more once the signal aborts, and charges no model for it", async () => {
    const breaker = new CircuitBreaker();
    const stop = new AbortController();
    stop.abort();
    const { result, run } = route(breaker, { entry: stall, fallback: "unused" }, stop.signal);
    await expect(result).rejects.toBe(stall);
    expect(run).toHaveBeenCalledOnce();
    await route(breaker, { entry: stall, fallback: "ok" }).result;
    expect(breaker.isOpen(modelKey(entry))).toBe(false);
  });
});
