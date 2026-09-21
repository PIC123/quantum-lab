// The Paul trap: stability of a charged particle in an oscillating
// quadrupole field, via the Mathieu equation
//     d²x/dξ² + (a − 2q cos 2ξ) x = 0,   ξ = Ω t / 2,
// with the radial parameters of a linear trap
//     q = 2 e V_rf / (m r0² Ω²),   a = −4 e κ U_dc / (m z0² Ω²) (radial, negative)
// The y direction has (−a, −q). Motion is stable when the solution stays
// bounded in both directions, which for a = 0 means q < 0.908.

import { CA40, E_CHARGE } from './constants.js';

/** Default trap geometry: a small linear trap. */
export const DEFAULT_TRAP = {
  r0: 0.5e-3,     // m, electrode-to-axis distance
  z0: 2.5e-3,     // m, endcap half-distance
  kappa: 0.3,     // geometric efficiency of the endcap DC field
  mass: CA40.mass,
  charge: E_CHARGE,
};

/** Mathieu parameters from voltages and RF frequency (Hz). */
export function mathieuParams({ vRf, fRf, uDc = 0 }, trap = DEFAULT_TRAP) {
  const omega = 2 * Math.PI * fRf;
  const q = (2 * trap.charge * vRf) / (trap.mass * trap.r0 ** 2 * omega ** 2);
  // Endcap DC confines axially and anti-confines radially (half as strong).
  const a = -(4 * trap.charge * trap.kappa * uDc) / (trap.mass * trap.z0 ** 2 * omega ** 2) / 2;
  return { a, q };
}

/**
 * Floquet stability of the Mathieu equation for one direction: integrate one
 * period ξ ∈ [0, π] for two independent initial conditions and check that
 * |trace of the monodromy matrix| < 2.
 */
export function mathieuStable(a, q, steps = 200) {
  const h = Math.PI / steps;
  const f = (xi, x, v) => [v, -(a - 2 * q * Math.cos(2 * xi)) * x];
  const integrate = (x, v) => {
    let xi = 0;
    for (let i = 0; i < steps; i++) {
      const k1 = f(xi, x, v);
      const k2 = f(xi + h / 2, x + (h / 2) * k1[0], v + (h / 2) * k1[1]);
      const k3 = f(xi + h / 2, x + (h / 2) * k2[0], v + (h / 2) * k2[1]);
      const k4 = f(xi + h, x + h * k3[0], v + h * k3[1]);
      x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      v += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      xi += h;
    }
    return [x, v];
  };
  const [x1] = integrate(1, 0);
  const [, v2] = integrate(0, 1);
  return Math.abs(x1 + v2) < 2;
}

/** Stable in both radial directions. */
export function isStable(a, q) {
  return mathieuStable(a, q) && mathieuStable(-a, -q);
}

/** Lowest-order secular frequency ω_sec ≈ (Ω/2)·√(a + q²/2), in rad/s. */
export function secularFrequency(a, q, fRf) {
  const beta2 = a + q * q / 2;
  if (beta2 <= 0) return 0;
  return (2 * Math.PI * fRf / 2) * Math.sqrt(beta2);
}

let mapCache = null;
/**
 * Stability map on a grid: returns {nq, na, qMax, aMin, aMax, cells}
 * with cells[i*nq + j] = 1 if stable. Cached after the first call.
 */
export function stabilityMap(nq = 48, na = 32, qMax = 1.2, aMin = -0.4, aMax = 0.3) {
  if (mapCache && mapCache.nq === nq && mapCache.na === na) return mapCache;
  const cells = new Uint8Array(nq * na);
  for (let i = 0; i < na; i++) {
    const a = aMin + (aMax - aMin) * (i + 0.5) / na;
    for (let j = 0; j < nq; j++) {
      const q = qMax * (j + 0.5) / nq;
      cells[i * nq + j] = isStable(a, q) ? 1 : 0;
    }
  }
  mapCache = { nq, na, qMax, aMin, aMax, cells };
  return mapCache;
}

/**
 * Time-domain motion of an ion in the trap, in trap units (r0 = 1, time in
 * RF phase ξ). Integrates the Mathieu equations in x and y with RK4 so
 * micromotion and secular motion both appear, and so an unstable setting
 * really does throw the ion out.
 */
export class IonMotion {
  constructor() { this.reset(); }

  reset(x = 0.15, y = -0.1, vx = 0, vy = 0.05) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.xi = 0; this.escaped = false;
    return this;
  }

  /** Advance by dXi radians of RF phase with the given (a, q). */
  step(a, q, dXi, sub = 4) {
    if (this.escaped) return;
    const h = dXi / sub;
    const ax = (xi, x) => -(a - 2 * q * Math.cos(2 * xi)) * x;
    const ay = (xi, y) => -(-a + 2 * q * Math.cos(2 * xi)) * y;
    for (let s = 0; s < sub; s++) {
      const xi = this.xi;
      const { x, y, vx, vy } = this;
      const k1x = vx, k1vx = ax(xi, x), k1y = vy, k1vy = ay(xi, y);
      const k2x = vx + h / 2 * k1vx, k2vx = ax(xi + h / 2, x + h / 2 * k1x);
      const k2y = vy + h / 2 * k1vy, k2vy = ay(xi + h / 2, y + h / 2 * k1y);
      const k3x = vx + h / 2 * k2vx, k3vx = ax(xi + h / 2, x + h / 2 * k2x);
      const k3y = vy + h / 2 * k2vy, k3vy = ay(xi + h / 2, y + h / 2 * k2y);
      const k4x = vx + h * k3vx, k4vx = ax(xi + h, x + h * k3x);
      const k4y = vy + h * k3vy, k4vy = ay(xi + h, y + h * k3y);
      this.x += h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x);
      this.vx += h / 6 * (k1vx + 2 * k2vx + 2 * k3vx + k4vx);
      this.y += h / 6 * (k1y + 2 * k2y + 2 * k3y + k4y);
      this.vy += h / 6 * (k1vy + 2 * k2vy + 2 * k3vy + k4vy);
      this.xi += h;
    }
    if (Math.hypot(this.x, this.y) > 1) this.escaped = true;
  }
}
