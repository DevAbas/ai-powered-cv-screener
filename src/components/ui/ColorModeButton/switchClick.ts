// The light-switch click the colour mode toggle plays (DESIGN.md,
// Components: Colour mode toggle): synthesized, so there is no audio file
// and no library. A click is a burst of noise through a bandpass filter, the
// snap, over a short low sine, the thock of the switch; "on" (to light) sits
// above "off" (to dark) so the direction is audible. The numbers are the
// design's, kept here beside the rule that reads them.

export type SwitchDirection = "on" | "off";

export interface SwitchClickRecipe {
  /** Centre of the bandpass the noise burst passes through, Hz. */
  snapHz: number;
  /** Width of that band: the filter's Q. */
  snapQ: number;
  /** Length of the noise burst, seconds. */
  snapSeconds: number;
  /** Peak gain of the snap, 0 to 1. */
  snapGain: number;
  /** The sine under the snap, Hz. */
  bodyHz: number;
  /** Length of the sine, seconds. */
  bodySeconds: number;
  /** Peak gain of the body, 0 to 1. */
  bodyGain: number;
  /** Time for each envelope to fall from its peak to silence, seconds. */
  decaySeconds: number;
}

/** Where an exponential ramp ends: Web Audio cannot ramp to 0, and this is inaudible. */
const SILENCE = 0.001;

/** The click for each direction: "on" a step brighter and higher than "off". */
export function switchClickRecipe(direction: SwitchDirection): SwitchClickRecipe {
  const on = direction === "on";
  return {
    snapHz: on ? 2600 : 1900,
    snapQ: 1.2,
    snapSeconds: 0.008,
    snapGain: 0.25,
    bodyHz: on ? 180 : 140,
    bodySeconds: 0.03,
    bodyGain: 0.12,
    decaySeconds: 0.04,
  };
}

let context: AudioContext | undefined;

/** The one AudioContext, created on the first press: a user gesture, which the autoplay policy allows. */
function audioContext(): AudioContext | undefined {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return undefined;
  context ??= new window.AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays the click, or does nothing where Web Audio is missing (an old browser, a test runner). */
export function playSwitchClick(direction: SwitchDirection): void {
  const ctx = audioContext();
  if (!ctx) return;
  const recipe = switchClickRecipe(direction);
  const now = ctx.currentTime;

  // The snap: white noise, band-limited, with a fast exponential decay.
  const frames = Math.max(1, Math.round(ctx.sampleRate * recipe.snapSeconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) samples[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = recipe.snapHz;
  band.Q.value = recipe.snapQ;
  const snapGain = ctx.createGain();
  snapGain.gain.setValueAtTime(recipe.snapGain, now);
  snapGain.gain.exponentialRampToValueAtTime(SILENCE, now + recipe.decaySeconds);
  noise.connect(band).connect(snapGain).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + recipe.decaySeconds);

  // The body: a short low sine under the snap.
  const body = ctx.createOscillator();
  body.type = "sine";
  body.frequency.value = recipe.bodyHz;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(recipe.bodyGain, now);
  bodyGain.gain.exponentialRampToValueAtTime(SILENCE, now + recipe.bodySeconds);
  body.connect(bodyGain).connect(ctx.destination);
  body.start(now);
  body.stop(now + recipe.bodySeconds);
}
