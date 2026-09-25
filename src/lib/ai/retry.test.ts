import { APICallError, RetryError, StreamProviderError } from "ai";
import { describe, expect, it, vi } from "vitest";
import { errorStatus, isDailyQuotaError, isRetryable, retryAfterMs, withRetry } from "./retry";

function apiError(statusCode: number, responseHeaders?: Record<string, string>) {
  return new APICallError({
    message: `HTTP ${statusCode}`,
    url: "https://example.com",
    requestBodyValues: {},
    statusCode,
    responseHeaders,
    isRetryable: statusCode === 429 || statusCode >= 500,
  });
}

// OpenRouter reports some upstream failures inside an HTTP 200 body; the
// provider throws them with statusCode 200 and the real code in `data`.
function bodyError(code: number) {
  return new APICallError({
    message: "Upstream error from Nvidia: Service temporarily overloaded",
    url: "https://openrouter.ai/api/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 200,
    data: { code, message: "overloaded", metadata: { error_type: "provider_overloaded" } },
  });
}

const noSleep = () => Promise.resolve();
const sleepSpy = () => vi.fn<(ms: number) => Promise<void>>(noSleep);

describe("isRetryable", () => {
  it("retries 429 and 5xx, not 400", () => {
    expect(isRetryable(apiError(429))).toBe(true);
    expect(isRetryable(apiError(503))).toBe(true);
    expect(isRetryable(apiError(400))).toBe(false);
    expect(isRetryable(new Error("boom"))).toBe(false);
  });

  it("reads the real status from an OpenRouter error in a 200 body", () => {
    expect(errorStatus(bodyError(503))).toBe(503);
    expect(isRetryable(bodyError(503))).toBe(true);
    expect(isRetryable(bodyError(400))).toBe(false);
  });

  it("retries mid-stream provider errors the SDK marks retryable", () => {
    const overloaded = new StreamProviderError({ message: "overloaded", statusCode: 503 });
    expect(isRetryable(overloaded)).toBe(true);
    expect(errorStatus(overloaded)).toBe(503);
    expect(isRetryable(new StreamProviderError({ message: "bad", statusCode: 400 }))).toBe(false);
  });

  it("looks through an SDK RetryError, except an aborted one", () => {
    const errors = [apiError(429)];
    expect(isRetryable(new RetryError({ message: "x", reason: "maxRetriesExceeded", errors }))).toBe(true);
    expect(isRetryable(new RetryError({ message: "x", reason: "abort", errors }))).toBe(false);
  });
});

describe("isDailyQuotaError", () => {
  it("recognises OpenRouter's free-models-per-day 429 and a Gemini per-day quota, not a per-minute one", () => {
    const daily = new APICallError({
      message: "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day",
      url: "https://openrouter.ai/api/v1/chat/completions",
      requestBodyValues: {},
      statusCode: 429,
    });
    expect(isDailyQuotaError(daily)).toBe(true);
    const gemini = (quotaId: string) =>
      new APICallError({
        message: "You exceeded your current quota, please check your plan and billing details.",
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent",
        requestBodyValues: {},
        statusCode: 429,
        responseBody: JSON.stringify({ error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId }] }] } }),
      });
    expect(isDailyQuotaError(gemini("GenerateRequestsPerDayPerProjectPerModel-FreeTier"))).toBe(true);
    expect(isDailyQuotaError(gemini("GenerateRequestsPerMinutePerProjectPerModel-FreeTier"))).toBe(false);
    expect(isDailyQuotaError(apiError(429))).toBe(false);
    expect(isDailyQuotaError(apiError(503))).toBe(false);
  });
});

describe("retryAfterMs", () => {
  it("reads retry-after-ms, then retry-after in seconds", () => {
    expect(retryAfterMs(apiError(429, { "retry-after-ms": "1500" }))).toBe(1500);
    expect(retryAfterMs(apiError(429, { "retry-after": "3" }))).toBe(3000);
    expect(retryAfterMs(apiError(429))).toBeUndefined();
  });
});

describe("withRetry", () => {
  it("retries a 429 and returns the eventual result", async () => {
    const fn = vi.fn().mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce("ok");
    const sleep = sleepSpy();
    await expect(withRetry(fn, { sleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries an OpenRouter 503 reported in a 200 body", async () => {
    const fn = vi.fn().mockRejectedValueOnce(bodyError(503)).mockResolvedValueOnce("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400", async () => {
    const fn = vi.fn().mockRejectedValue(apiError(400));
    await expect(withRetry(fn, { sleep: noSleep })).rejects.toThrow("HTTP 400");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the given number of attempts", async () => {
    const fn = vi.fn().mockRejectedValue(apiError(503));
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow("HTTP 503");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("waits as long as retry-after asks, capped at maxMs", async () => {
    const sleep = sleepSpy();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(apiError(429, { "retry-after": "5" }))
      .mockRejectedValueOnce(apiError(429, { "retry-after": "500" }))
      .mockResolvedValueOnce("ok");
    await withRetry(fn, { sleep, maxMs: 60_000 });
    expect(sleep.mock.calls).toEqual([[5000], [60_000]]);
  });

  it("backs off exponentially without retry-after", async () => {
    const sleep = sleepSpy();
    const fn = vi.fn().mockRejectedValue(apiError(500));
    await expect(withRetry(fn, { attempts: 3, baseMs: 100, sleep })).rejects.toThrow();
    const [first, second] = sleep.mock.calls.map(([ms]) => ms);
    expect(first).toBeGreaterThanOrEqual(100);
    expect(first).toBeLessThanOrEqual(120);
    expect(second).toBeGreaterThanOrEqual(200);
    expect(second).toBeLessThanOrEqual(240);
  });
});
