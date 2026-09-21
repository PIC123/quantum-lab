// Decoherence models for the Ramsey experiment and the Noise Sandbox.
//
// A Ramsey sequence is: π/2 pulse, wait τ, π/2 pulse with phase φ, measure.
// Ideal result: P(1) = ½ (1 + cos(δ τ + φ)) where δ is the detuning.
// Noise reduces the fringe contrast C:
//   • slow (quasi-static) dephasing: each shot sees a different frequency
//     offset drawn from N(0, σ_slow); averaging gives C = exp(−(σ_slow τ)²/2).
//     A spin echo (π pulse about Y at τ/2) cancels it exactly. The echo pulse
//     is about Y so the fringe keeps the same sign as without an echo.
//   • fast dephasing with time constant T2: random phase diffusion,
//     C = exp(−τ/T2). An echo does not help.
//   • laser intensity flicker: each shot's Rabi frequency is off by a
//     fraction drawn from N(0, jitter), so the π/2 pulses are imperfect.
//   • motional heating: modelled as a contrast loss exp(−h τ) because the
//     Debye–Waller factor of the pulses shrinks as the ion heats. This is a
//     simplification; the "Math" level says so.

import { QState } from './qstate.js';
import { pulseUnitary } from './pulses.js';
import { RZ } from './gates.js';

/**
 * @typedef {Object} NoiseParams
 * @property {number} sigmaSlow rad/s, s.d. of shot-to-shot frequency offset
 * @property {number} t2       seconds, fast dephasing time (Infinity = none)
 * @property {number} jitter   fractional Rabi-frequency s.d. per shot
 * @property {number} heating  1/s, contrast decay rate from motional heating
 */

export const NO_NOISE = { sigmaSlow: 0, t2: Infinity, jitter: 0, heating: 0 };

/** Analytic fringe contrast for a wait time τ. */
export function ramseyContrast(tau, noise, echo = false) {
  const slow = echo ? 1 : Math.exp(-0.5 * (noise.sigmaSlow * tau) ** 2);
  const fast = Number.isFinite(noise.t2) ? Math.exp(-tau / noise.t2) : 1;
  const heat = Math.exp(-noise.heating * tau);
  // Two imperfect π/2 pulses: contrast ≈ ⟨sin(π/2(1+ε))⟩² ≈ 1 − (π²/4)σ² to first order.
  const pulse = Math.max(0, 1 - (Math.PI ** 2 / 4) * noise.jitter ** 2);
  return slow * fast * heat * pulse;
}

/** Analytic P(1) for a Ramsey fringe. */
export function ramseyProbability(tau, phase, detuning, noise = NO_NOISE, echo = false) {
  const C = ramseyContrast(tau, noise, echo);
  const phi = echo ? phase : detuning * tau + phase;
  return 0.5 * (1 + C * Math.cos(phi));
}

/**
 * Run one Ramsey shot as an actual circuit with noise sampled per shot.
 * Returns the measured bit (1 = excited).
 */
export function ramseyShot({ tau, phase, detuning = 0, cal, noise = NO_NOISE, echo = false }, rng) {
  const s = new QState(1);
  const eps = noise.jitter ? rng.normal(0, noise.jitter) : 0;
  const rabi = cal.rabi * (1 + eps);
  const delta = detuning + (noise.sigmaSlow ? rng.normal(0, noise.sigmaSlow) : 0);
  const fastSd = Number.isFinite(noise.t2) && noise.t2 > 0 ? Math.sqrt(2 * tau / noise.t2) : 0;
  const heatSd = noise.heating ? Math.sqrt(2 * noise.heating * tau) : 0;

  s.apply(pulseUnitary({ duration: cal.tHalf, phase: 0, rabi }), [0]);
  if (echo) {
    s.apply(RZ(delta * tau / 2 + (fastSd ? rng.normal(0, fastSd / Math.SQRT2) : 0)), [0]);
    s.apply(pulseUnitary({ duration: cal.tPi, phase: Math.PI / 2, rabi }), [0]); // echo π pulse about Y
    s.apply(RZ(delta * tau / 2 + (fastSd ? rng.normal(0, fastSd / Math.SQRT2) : 0)), [0]);
  } else {
    s.apply(RZ(delta * tau + (fastSd ? rng.normal(0, fastSd) : 0)), [0]);
  }
  if (heatSd) s.apply(RZ(rng.normal(0, heatSd)), [0]);
  s.apply(pulseUnitary({ duration: cal.tHalf, phase, rabi }), [0]);
  return rng.chance(s.prob1(0)) ? 1 : 0;
}

/** Average of many Ramsey shots. */
export function ramseyAverage(params, shots, rng) {
  let ones = 0;
  for (let i = 0; i < shots; i++) ones += ramseyShot(params, rng);
  return ones / shots;
}

/**
 * Fit the contrast of a sampled fringe: given P(1) samples at phases,
 * C ≈ 2·√(⟨(p−½)cos φ⟩² + ⟨(p−½)sin φ⟩²).
 */
export function fitContrast(phases, probs) {
  let c = 0, s = 0;
  for (let i = 0; i < phases.length; i++) {
    c += (probs[i] - 0.5) * Math.cos(phases[i]);
    s += (probs[i] - 0.5) * Math.sin(phases[i]);
  }
  c /= phases.length; s /= phases.length;
  return Math.min(1, 4 * Math.hypot(c, s));
}
