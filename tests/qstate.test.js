import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QState, bellFidelity, label } from '../site/labs/core/qstate.js';
import * as G from '../site/labs/core/gates.js';
import { Rng } from '../site/labs/core/rng.js';
import { close } from './helpers.js';

test('starts in |0…0⟩ and X flips the right qubit (qubit 0 is the leftmost)', () => {
  const s = new QState(2).apply(G.X(), [0]);
  assert.equal(label(s.sampleOne(new Rng(1)), 2), '10');
  close(s.prob1(0), 1); close(s.prob1(1), 0);
});

test('H gives 50/50 and H·H returns to |0⟩', () => {
  const s = new QState(1).apply(G.H(), [0]);
  close(s.prob1(0), 0.5);
  s.apply(G.H(), [0]);
  close(s.prob1(0), 0, 1e-12);
});

test('two π/2 rotations equal one π rotation: |0⟩ → |1⟩ with certainty', () => {
  const s = new QState(1).apply(G.RX(Math.PI / 2), [0]).apply(G.RX(Math.PI / 2), [0]);
  close(s.prob1(0), 1, 1e-12);
});

test('Bloch vectors of the six cardinal states', () => {
  const b = (st) => st.bloch(0).map((v) => Math.round(v * 1e9) / 1e9 + 0);
  assert.deepEqual(b(new QState(1)), [0, 0, 1]);
  assert.deepEqual(b(new QState(1).apply(G.X(), [0])), [0, 0, -1]);
  assert.deepEqual(b(new QState(1).apply(G.H(), [0])), [1, 0, 0]);
  assert.deepEqual(b(new QState(1).apply(G.H(), [0]).apply(G.Z(), [0])), [-1, 0, 0]);
  assert.deepEqual(b(new QState(1).apply(G.H(), [0]).apply(G.S(), [0])), [0, 1, 0]);
  assert.deepEqual(b(new QState(1).apply(G.H(), [0]).apply(G.Sdg(), [0])), [0, -1, 0]);
});

test('Rx(θ) rotates the Bloch vector from +z towards −y', () => {
  const [x, y, z] = new QState(1).apply(G.RX(Math.PI / 2), [0]).bloch(0);
  close(x, 0, 1e-12); close(y, -1, 1e-12); close(z, 0, 1e-12);
});

test('CNOT with control on qubit 0: |10⟩ → |11⟩, |01⟩ stays', () => {
  const s = new QState(2).setBasis('10').apply(G.CNOT(), [0, 1]);
  close(s.probabilities()[3], 1);
  const t = new QState(2).setBasis('01').apply(G.CNOT(), [0, 1]);
  close(t.probabilities()[1], 1);
  // reversed qubit order: control on qubit 1
  const u = new QState(2).setBasis('01').apply(G.CNOT(), [1, 0]);
  close(u.probabilities()[3], 1);
});

test('Bell state via H + CNOT shows only 00 and 11, fidelity 1, reduced Bloch vectors vanish', () => {
  const s = new QState(2).apply(G.H(), [0]).apply(G.CNOT(), [0, 1]);
  const p = s.probabilities();
  close(p[0], 0.5); close(p[1], 0); close(p[2], 0); close(p[3], 0.5);
  close(bellFidelity(s), 1);
  const b = s.bloch(0);
  close(Math.hypot(...b), 0, 1e-12);
});

test('MS(π/2) Bell state: only 00 and 11; Bell fidelity vs angle is (1+sin θ)/2', () => {
  for (const theta of [0.3, Math.PI / 2, 2.0]) {
    const s = new QState(2).apply(G.MS(theta), [0, 1]);
    const p = s.probabilities();
    close(p[1], 0, 1e-12); close(p[2], 0, 1e-12);
    close(bellFidelity(s), (1 + Math.sin(theta)) / 2, 1e-9);
  }
});

test('sampling is seeded, reproducible and matches probabilities', () => {
  const s = new QState(1).apply(G.RY(1.0), [0]);
  const c1 = s.sample(20000, new Rng(42));
  const c2 = s.sample(20000, new Rng(42));
  assert.deepEqual(Array.from(c1), Array.from(c2));
  close(c1[1] / 20000, s.prob1(0), 0.02);
});

test('measure collapses and renormalises', () => {
  const s = new QState(2).apply(G.H(), [0]).apply(G.CNOT(), [0, 1]);
  const out = s.measure(0, new Rng(7));
  const p = s.probabilities();
  close(p[out ? 3 : 0], 1, 1e-12);
});

test('fidelity between states', () => {
  const a = new QState(1), b = new QState(1).apply(G.H(), [0]);
  close(a.fidelity(a), 1); close(a.fidelity(b), 0.5);
});

test('toString renders kets', () => {
  assert.equal(new QState(1).toString(), '1.00|0⟩');
  assert.equal(new QState(1).apply(G.H(), [0]).toString(), '0.71|0⟩ + 0.71|1⟩');
});

test('3-qubit two-qubit gate on non-adjacent qubits', () => {
  const s = new QState(3).setBasis('100').apply(G.CNOT(), [0, 2]);
  close(s.probabilities()[0b101], 1);
});
