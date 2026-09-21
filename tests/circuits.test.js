import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Cx from '../site/labs/core/circuits.js';
import { idealCalibration } from '../site/labs/core/pulses.js';
import { Rng } from '../site/labs/core/rng.js';
import { close } from './helpers.js';

const cal = idealCalibration();

test('Grover on 2 qubits finds the marked item with certainty, ideal and compiled', () => {
  for (let marked = 0; marked < 4; marked++) {
    const c = Cx.grover2(marked);
    close(Cx.runIdeal(c).state.probabilities()[marked], 1, 1e-9);
    const ops = Cx.compile(c, cal);
    close(Cx.runCompiled(ops, 2, cal).state.probabilities()[marked], 1, 1e-9);
  }
});

test('Deutsch–Jozsa answers constant vs balanced in one query', () => {
  for (const o of ['const0', 'const1', 'identity', 'not']) {
    const c = Cx.deutschJozsa(o);
    const p1 = Cx.runIdeal(c).state.prob1(0);
    close(p1, c.balanced ? 1 : 0, 1e-9);
    close(Cx.runCompiled(Cx.compile(c, cal), 2, cal).state.prob1(0), c.balanced ? 1 : 0, 1e-9);
  }
});

test('teleportation delivers the state to qubit 2 for every measurement outcome', () => {
  const c = Cx.teleport(1.1);
  const rng = new Rng(21);
  const seen = new Set();
  for (let i = 0; i < 40; i++) {
    const { state, bits } = Cx.runIdeal(c, rng);
    seen.add(bits.join(''));
    close(Cx.blochFidelity(state, 2, c.targetBloch), 1, 1e-9);
  }
  assert.equal(seen.size, 4, 'all four Bell outcomes occurred');
  const { state } = Cx.runCompiled(Cx.compile(c, cal), 3, cal, rng);
  close(Cx.blochFidelity(state, 2, c.targetBloch), 1, 1e-9);
});

test('a miscalibrated machine lowers Grover success and uses the expected pulse count', () => {
  const bad = { ...cal, tPi: cal.tPi * 0.92, tHalf: cal.tHalf * 0.92 };
  const c = Cx.grover2(3);
  const ops = Cx.compile(c, bad);
  const p = Cx.runCompiled(ops, 2, bad).state.probabilities()[3];
  assert.ok(p < 0.95 && p > 0.3, `p = ${p}`);
  assert.ok(Cx.pulseCount(ops) > 10);
});
