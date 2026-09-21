// Circuits as gate lists, run either ideally or compiled into the student's
// own laser pulses. This is what makes sloppy calibration in experiment 4
// show up as lower success in experiment 8.
//
// A circuit is { n, ops } where each op is one of
//   { g: 'X'|'Y'|'Z'|'H'|'S'|'Sdg'|'T', q: [k] }
//   { g: 'RX'|'RY'|'RZ', q: [k], theta }
//   { g: 'CNOT'|'CZ', q: [control, target] }
//   { g: 'MS', q: [k1, k2], theta, phi }
//   { g: 'M', q: [k], bit: b }                measure qubit k into classical bit b
//   { g: <any>, ..., cond: b }                apply only if classical bit b == 1

import { QState } from './qstate.js';
import * as G from './gates.js';
import { pulseUnitary, idealCalibration } from './pulses.js';

const SINGLE = { X: G.X, Y: G.Y, Z: G.Z, H: G.H, S: G.S, Sdg: G.Sdg, T: G.T };

/** Ideal unitary of one op. */
export function idealGate(op) {
  if (SINGLE[op.g]) return SINGLE[op.g]();
  switch (op.g) {
    case 'RX': return G.RX(op.theta);
    case 'RY': return G.RY(op.theta);
    case 'RZ': return G.RZ(op.theta);
    case 'CNOT': return G.CNOT();
    case 'CZ': return G.CZ();
    case 'MS': return G.MS(op.theta ?? Math.PI / 2, op.phi ?? 0);
    default: throw new Error(`unknown gate ${op.g}`);
  }
}

/**
 * Run a circuit ideally for one shot. Measurements collapse the state and
 * fill `bits`. Returns { state, bits }.
 */
export function runIdeal(circuit, rng) {
  const state = new QState(circuit.n);
  const bits = [];
  for (const op of circuit.ops) {
    if (op.cond !== undefined && bits[op.cond] !== 1) continue;
    if (op.g === 'M') { bits[op.bit] = state.measure(op.q[0], rng); continue; }
    state.apply(idealGate(op), op.q);
  }
  return { state, bits };
}

/**
 * Compile a circuit into physical operations for a trapped-ion machine:
 *   { kind: 'pulse', q, duration, phase, label }
 *   { kind: 'vz', q, theta, label }           virtual Z (frame change, free)
 *   { kind: 'ms', q: [a, b], theta, phi, label }
 *   { kind: 'M', q, bit }
 * The calibration supplies tPi / tHalf and the MS angle the student found.
 * Z rotations are exact; H, X, Y, CNOT and CZ use the student's pulses.
 */
export function compile(circuit, cal = idealCalibration()) {
  const out = [];
  const half = Math.PI / 2;
  const pulse = (q, duration, phase, label, cond) => out.push({ kind: 'pulse', q, duration, phase, label, cond });
  const vz = (q, theta, label, cond) => out.push({ kind: 'vz', q, theta, label, cond });
  const ms = (q, theta, phi, label, cond) => out.push({ kind: 'ms', q, theta, phi, label, cond });
  const msTheta = cal.msTheta ?? half;

  const cnot = ([c, t], cond) => {
    // CNOT = (Ry(−π/2)⊗I) · MS(π/2) · (Rx(−π/2)⊗Rx(−π/2)) · (Ry(π/2)⊗I)
    pulse(c, cal.tHalf, half, 'Ry(π/2)', cond);
    pulse(c, cal.tHalf, Math.PI, 'Rx(−π/2)', cond);
    pulse(t, cal.tHalf, Math.PI, 'Rx(−π/2)', cond);
    ms([c, t], msTheta, 0, 'MS', cond);
    pulse(c, cal.tHalf, -half, 'Ry(−π/2)', cond);
  };

  for (const op of circuit.ops) {
    const q = op.q[0];
    const cond = op.cond;
    switch (op.g) {
      case 'X': pulse(q, cal.tPi, 0, 'X', cond); break;
      case 'Y': pulse(q, cal.tPi, half, 'Y', cond); break;
      case 'Z': vz(q, Math.PI, 'Z', cond); break;
      case 'S': vz(q, half, 'S', cond); break;
      case 'Sdg': vz(q, -half, 'S†', cond); break;
      case 'T': vz(q, Math.PI / 4, 'T', cond); break;
      case 'RZ': vz(q, op.theta, 'Rz', cond); break;
      case 'RX': pulse(q, Math.abs(op.theta) / Math.PI * cal.tPi, op.theta >= 0 ? 0 : Math.PI, 'Rx', cond); break;
      case 'RY': pulse(q, Math.abs(op.theta) / Math.PI * cal.tPi, op.theta >= 0 ? half : -half, 'Ry', cond); break;
      case 'H': vz(q, Math.PI, 'Z', cond); pulse(q, cal.tHalf, half, 'Ry(π/2)', cond); break;
      case 'CNOT': cnot(op.q, cond); break;
      case 'CZ': {
        const [c, t] = op.q;
        vz(t, Math.PI, 'Z', cond); pulse(t, cal.tHalf, half, 'Ry(π/2)', cond);
        cnot([c, t], cond);
        vz(t, Math.PI, 'Z', cond); pulse(t, cal.tHalf, half, 'Ry(π/2)', cond);
        break;
      }
      case 'MS': ms(op.q, op.theta ?? msTheta, op.phi ?? 0, 'MS', cond); break;
      case 'M': out.push({ kind: 'M', q, bit: op.bit, cond }); break;
      default: throw new Error(`cannot compile ${op.g}`);
    }
  }
  return out;
}

/** Run compiled physical ops for one shot with the machine's true Rabi frequency. */
export function runCompiled(ops, n, cal, rng) {
  const state = new QState(n);
  const bits = [];
  for (const op of ops) {
    if (op.cond !== undefined && bits[op.cond] !== 1) continue;
    switch (op.kind) {
      case 'pulse': state.apply(pulseUnitary({ duration: op.duration, phase: op.phase, rabi: cal.rabi }), [op.q]); break;
      case 'vz': state.apply(G.RZ(op.theta), [op.q]); break;
      case 'ms': state.apply(G.MS(op.theta, op.phi), op.q); break;
      case 'M': bits[op.bit] = state.measure(op.q, rng); break;
      default: throw new Error(`unknown op ${op.kind}`);
    }
  }
  return { state, bits };
}

/** Number of laser pulses (physical gates) in a compiled list. */
export const pulseCount = (ops) => ops.filter((o) => o.kind === 'pulse' || o.kind === 'ms').length;

// ---- the mission circuits ----------------------------------------------

/** Two-qubit Grover search for the marked item (0..3). One oracle call. */
export function grover2(marked) {
  const ops = [{ g: 'H', q: [0] }, { g: 'H', q: [1] }];
  // Oracle: phase-flip |marked⟩ using X gates around a CZ.
  const flips = [];
  if (!(marked & 2)) flips.push({ g: 'X', q: [0] });
  if (!(marked & 1)) flips.push({ g: 'X', q: [1] });
  ops.push(...flips, { g: 'CZ', q: [0, 1] }, ...flips);
  // Diffusion: H X CZ X H
  ops.push({ g: 'H', q: [0] }, { g: 'H', q: [1] }, { g: 'X', q: [0] }, { g: 'X', q: [1] },
    { g: 'CZ', q: [0, 1] }, { g: 'X', q: [0] }, { g: 'X', q: [1] }, { g: 'H', q: [0] }, { g: 'H', q: [1] });
  return { n: 2, ops, name: `Grover, marked |${marked.toString(2).padStart(2, '0')}⟩` };
}

/**
 * Deutsch–Jozsa with a one-bit input. Oracle types: 'const0', 'const1',
 * 'identity' (balanced), 'not' (balanced). Measuring qubit 0 gives 0 for
 * constant and 1 for balanced.
 */
export function deutschJozsa(oracle) {
  const ops = [{ g: 'X', q: [1] }, { g: 'H', q: [0] }, { g: 'H', q: [1] }];
  switch (oracle) {
    case 'const0': break;
    case 'const1': ops.push({ g: 'X', q: [1] }); break;
    case 'identity': ops.push({ g: 'CNOT', q: [0, 1] }); break;
    case 'not': ops.push({ g: 'X', q: [0] }, { g: 'CNOT', q: [0, 1] }, { g: 'X', q: [0] }); break;
    default: throw new Error('unknown oracle');
  }
  ops.push({ g: 'H', q: [0] });
  return { n: 2, ops, name: `Deutsch–Jozsa, oracle ${oracle}`, balanced: oracle === 'identity' || oracle === 'not' };
}

/**
 * Teleport the state Ry(theta)|0⟩ from qubit 0 to qubit 2 via a Bell pair on
 * qubits 1 and 2, with measurement and classical corrections.
 */
export function teleport(theta) {
  const ops = [
    { g: 'RY', q: [0], theta },             // prepare the message state on A
    { g: 'H', q: [1] }, { g: 'CNOT', q: [1, 2] }, // Bell pair B–C
    { g: 'CNOT', q: [0, 1] }, { g: 'H', q: [0] }, // Bell measurement on A,B
    { g: 'M', q: [0], bit: 0 }, { g: 'M', q: [1], bit: 1 },
    { g: 'X', q: [2], cond: 1 },            // corrections on C
    { g: 'Z', q: [2], cond: 0 },
  ];
  return { n: 3, ops, name: 'Teleportation', targetBloch: [Math.sin(theta), 0, Math.cos(theta)] };
}

/** Fidelity of qubit k's reduced state with a target Bloch vector. */
export function blochFidelity(state, k, target) {
  const b = state.bloch(k);
  return 0.5 * (1 + b[0] * target[0] + b[1] * target[1] + b[2] * target[2]);
}
