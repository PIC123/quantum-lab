// Doppler cooling of a trapped ion by one laser beam along its motion.
//
// A moving ion sees the laser Doppler shifted by −k·v. With the laser tuned
// below resonance (red detuning, Δ < 0) the ion scatters more photons when it
// moves towards the beam, so on average the photon kicks slow it down.
// Photon recoil adds a random kick per scattering event, which sets a floor:
// the Doppler limit k_B T_D = ħΓ/2.
//
// This model averages the scattering force over one oscillation of the ion
// in the trap (semiclassical, single beam, no saturation broadening beyond the
// usual (1+s) factor). It is exact within those assumptions and reproduces
// the Doppler limit, red-detuning cooling and blue-detuning heating.

import { CA40, K_COOL, HBAR, KB, DOPPLER_LIMIT_K, RECOIL_ENERGY_J } from './constants.js';

const GAMMA = CA40.cooling.gamma;
const M = CA40.mass;

/** Photon scattering rate for a velocity v (m/s) along the beam. */
export function scatterRate(v, detuning, s) {
  const d = (2 * (detuning - K_COOL * v)) / GAMMA;
  return (GAMMA / 2) * s / (1 + s + d * d);
}

/**
 * Cooling (negative) or heating power on an oscillating ion, averaged over
 * one cycle, in W. E is the ion's total energy in J.
 * Returns {power, rate} where rate is the mean scattering rate.
 */
export function coolingPower(E, detuning, s, samples = 48) {
  const v0 = Math.sqrt(2 * E / M);
  let fv = 0, r = 0;
  for (let i = 0; i < samples; i++) {
    const th = (2 * Math.PI * (i + 0.5)) / samples;
    const v = v0 * Math.cos(th);
    const R = scatterRate(v, detuning, s);
    fv += HBAR * K_COOL * R * v;   // force × velocity
    r += R;
  }
  fv /= samples; r /= samples;
  // Each scattering event adds one recoil energy for absorption and, on
  // average, one for emission along the axis: 2·E_recoil = (ħk)²/m.
  const heating = r * 2 * RECOIL_ENERGY_J;
  return { power: fv + heating, rate: r };
}

/** Steady-state temperature in the linear (cold) regime, K; Infinity if heating. */
export function equilibriumTemperature(detuning, s) {
  if (detuning >= 0) return Infinity;
  const D = 1 + s + (2 * detuning / GAMMA) ** 2;
  return (HBAR * GAMMA ** 2 * D) / (8 * Math.abs(detuning) * KB);
}

export class CoolingSim {
  /** @param {number} T0 initial temperature in K */
  constructor(T0 = 10) {
    this.reset(T0);
  }

  reset(T0 = 10) {
    this.E = KB * T0;
    this.time = 0;
    this.photons = 0;
    return this;
  }

  get temperature() { return this.E / KB; }

  /**
   * Advance the ion energy by dt seconds of simulated time with the laser
   * at `detuning` (rad/s) and saturation `s`. Uses small sub-steps so the
   * exponential approach is integrated accurately.
   */
  step(dt, detuning, s, maxSub = 20) {
    let remaining = dt;
    let sub = 0;
    while (remaining > 0 && sub < maxSub) {
      const { power, rate } = coolingPower(this.E, detuning, s);
      // Limit each sub-step so the energy changes by at most ~10 %.
      let h = remaining;
      if (power !== 0) h = Math.min(h, 0.1 * this.E / Math.abs(power));
      h = Math.max(h, remaining / maxSub);
      this.E = Math.max(KB * 1e-6, this.E + power * h);
      this.photons += rate * h;
      this.time += h;
      remaining -= h;
      sub++;
    }
  }
}

export { DOPPLER_LIMIT_K, GAMMA };
