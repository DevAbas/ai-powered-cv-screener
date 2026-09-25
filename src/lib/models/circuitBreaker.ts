// In-memory circuit breaker per model (keys and routing in modelRouting.ts).
// After `threshold` failures (timeouts or 5xx) within `windowMs`, the model
// is passed over for `cooldownMs`; after the cooldown it is tried again, and
// one more failure reopens the breaker at once. `trip` opens it immediately.

export interface BreakerOptions {
  threshold?: number;
  windowMs?: number;
  cooldownMs?: number;
  now?: () => number;
}

interface BreakerState {
  failures: number[];
  openUntil?: number;
  /** The cooldown has passed and the model is on probation. */
  halfOpen: boolean;
}

export class CircuitBreaker {
  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private readonly states = new Map<string, BreakerState>();

  constructor({ threshold = 2, windowMs = 5 * 60_000, cooldownMs = 3 * 60_000, now = Date.now }: BreakerOptions = {}) {
    this.threshold = threshold;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
    this.now = now;
  }

  private state(key: string): BreakerState {
    let state = this.states.get(key);
    if (!state) {
      state = { failures: [], halfOpen: false };
      this.states.set(key, state);
    }
    return state;
  }

  /** True while the model should be passed over. */
  isOpen(key: string): boolean {
    const state = this.state(key);
    if (state.openUntil === undefined) return false;
    if (this.now() < state.openUntil) return true;
    state.openUntil = undefined;
    state.halfOpen = true;
    return false;
  }

  recordFailure(key: string): void {
    const state = this.state(key);
    const now = this.now();
    if (state.halfOpen) {
      state.halfOpen = false;
      state.failures = [];
      state.openUntil = now + this.cooldownMs;
      return;
    }
    state.failures = [...state.failures.filter((t) => now - t < this.windowMs), now];
    if (state.failures.length >= this.threshold) {
      state.failures = [];
      state.openUntil = now + this.cooldownMs;
    }
  }

  /** Opens the breaker at once, for failures that make retrying pointless (a daily quota). */
  trip(key: string): void {
    const state = this.state(key);
    state.failures = [];
    state.halfOpen = false;
    state.openUntil = this.now() + this.cooldownMs;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }
}

/** The process-wide breaker for every model call. */
export const modelBreaker = new CircuitBreaker();
