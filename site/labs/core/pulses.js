// Laser pulses → unitaries. This is the one place where a pulse (duration,
// phase, detuning, Rabi frequency) becomes a gate, so the lab view and the
// circuit view always agree.
//
// Model: a two-level atom driven by a laser in the rotating frame,
//   H = (Δ/2) σz + (Ω/2)(cos φ σx + sin φ σy),
// which for duration t is a rotation by θ = Ω' t about the axis
//   n = (Ω cos φ, Ω sin φ, Δ) / Ω',   Ω' = √(Ω² + Δ²).
// Starting in |0⟩ the excited population is P(1) = (Ω/Ω')² sin²(Ω' t / 2):
// on resonance a "π pulse" (Ω t = π) flips the qubit completely.

import { rotation, R, RZ, mul, X as Xgate, processFidelity } from './gates.js';

/**
 * @typedef {Object} Pulse
 * @property {number} duration  seconds
 * @property {number} [phase]   radians, laser phase (rotation axis azimuth)
 * @property {number} [detuning] rad/s, laser frequency minus qubit frequency
 * @property {number} [rabi]    rad/s, Rabi frequency Ω (defaults to cfg.rabi)
 */

/** Default qubit-laser parameters for the lab: Ω = 2π × 100 kHz → t_π = 5 µs. */
export const DEFAULT_RABI = 2 * Math.PI * 100e3;

/** π-pulse time for a Rabi frequency. */
export const piTime = (rabi = DEFAULT_RABI) => Math.PI / rabi;

/** Effective (generalised) Rabi frequency. */
export const effectiveRabi = (rabi, detuning = 0) => Math.hypot(rabi, detuning);

/** Unitary for a pulse. */
export function pulseUnitary(pulse, defaults = {}) {
  const rabi = pulse.rabi ?? defaults.rabi ?? DEFAULT_RABI;
  const phase = pulse.phase ?? 0;
  const detuning = pulse.detuning ?? 0;
  const t = pulse.duration;
  const w = effectiveRabi(rabi, detuning);
  if (w === 0 || t === 0) return rotation(1, 0, 0, 0);
  return rotation((rabi * Math.cos(phase)) / w, (rabi * Math.sin(phase)) / w, detuning / w, w * t);
}

/** Analytic P(1) after a pulse applied to |0⟩. */
export function excitedPopulation(pulse, defaults = {}) {
  const rabi = pulse.rabi ?? defaults.rabi ?? DEFAULT_RABI;
  const detuning = pulse.detuning ?? 0;
  const w = effectiveRabi(rabi, detuning);
  if (w === 0) return 0;
  return (rabi / w) ** 2 * Math.sin(w * pulse.duration / 2) ** 2;
}

/** Rotation angle θ = Ω' t of a pulse, in radians. */
export const pulseAngle = (pulse, defaults = {}) =>
  effectiveRabi(pulse.rabi ?? defaults.rabi ?? DEFAULT_RABI, pulse.detuning ?? 0) * pulse.duration;

/**
 * A student's calibration: the pulse durations they found for X (π) and
 * for the "half flip" (π/2). Gates built from these carry the student's
 * miscalibration into later experiments.
 * @typedef {Object} Calibration
 * @property {number} rabi   rad/s, the machine's true Rabi frequency
 * @property {number} tPi    seconds, the student's π-pulse duration
 * @property {number} tHalf  seconds, the student's π/2-pulse duration
 */

/** Ideal calibration for a Rabi frequency. */
export const idealCalibration = (rabi = DEFAULT_RABI) => ({ rabi, tPi: Math.PI / rabi, tHalf: Math.PI / (2 * rabi) });

/**
 * Compile common gates into pulses with a given calibration. Z rotations are
 * "virtual" (a frame change, perfect) as on real trapped-ion hardware; H is
 * compiled as R_y(π/2)·Z.
 * @param {Calibration} cal
 * @param {string} name
 */
export function compileGate(cal, name) {
  switch (name) {
    case 'X': return [{ duration: cal.tPi, phase: 0 }];
    case 'Y': return [{ duration: cal.tPi, phase: Math.PI / 2 }];
    case 'SX': return [{ duration: cal.tHalf, phase: 0 }];
    case 'H': return [{ virtualZ: Math.PI }, { duration: cal.tHalf, phase: Math.PI / 2 }];
    case 'RY90': return [{ duration: cal.tHalf, phase: Math.PI / 2 }];
    case 'RY-90': return [{ duration: cal.tHalf, phase: -Math.PI / 2 }];
    case 'RX-90': return [{ duration: cal.tHalf, phase: Math.PI }];
    default: throw new Error(`no pulse compilation for ${name}`);
  }
}

/** Unitary of a compiled pulse sequence (applied left to right). */
export function sequenceUnitary(seq, cal) {
  let U = rotation(1, 0, 0, 0);
  for (const p of seq) {
    const g = p.virtualZ !== undefined ? RZ(p.virtualZ) : pulseUnitary({ ...p, rabi: cal.rabi });
    U = mul(g, U);
  }
  return U;
}

/** Process fidelity of the student's compiled X gate against an ideal X. */
export function xGateFidelity(cal) {
  return processFidelity(Xgate(), sequenceUnitary(compileGate(cal, 'X'), cal));
}

/** Convenience: a pulse of angle θ (about axis φ) at the given calibration. */
export const pulseFor = (cal, theta, phase = 0) => ({ duration: theta / cal.rabi, phase });

export { R };
