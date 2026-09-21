import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../site/labs/core/pulses.js';
import * as G from '../site/labs/core/gates.js';
import { QState } from '../site/labs/core/qstate.js';
import { close } from './helpers.js';

const cal = P.idealCalibration();

test('a π pulse on resonance gives P(1) = 1 and equals X up to phase', () => {
  const pulse = { duration: P.piTime(), phase: 0 };
  close(P.excitedPopulation(pulse), 1, 1e-12);
  assert.ok(G.equalUpToPhase(P.pulseUnitary(pulse), G.X()));
  const s = new QState(1).apply(P.pulseUnitary(pulse), [0]);
  close(s.prob1(0), 1, 1e-12);
});

test('a π/2 pulse gives 50/50, two of them give |1⟩', () => {
  const half = { duration: P.piTime() / 2 };
  close(P.excitedPopulation(half), 0.5, 1e-12);
  const s = new QState(1).apply(P.pulseUnitary(half), [0]).apply(P.pulseUnitary(half), [0]);
  close(s.prob1(0), 1, 1e-12);
});

test('Rabi oscillation P(1) = sin²(Ωt/2) and its pulse angle', () => {
  for (const t of [1e-6, 2.5e-6, 7e-6]) {
    close(P.excitedPopulation({ duration: t }), Math.sin(P.DEFAULT_RABI * t / 2) ** 2, 1e-12);
    close(P.pulseAngle({ duration: t }), P.DEFAULT_RABI * t, 1e-12);
  }
});

test('detuning makes the oscillation faster and shallower', () => {
  const det = P.DEFAULT_RABI; // Δ = Ω → max P(1) = 1/2
  const w = P.effectiveRabi(P.DEFAULT_RABI, det);
  close(w, Math.SQRT2 * P.DEFAULT_RABI, 1e-6);
  const tMax = Math.PI / w;
  close(P.excitedPopulation({ duration: tMax, detuning: det }), 0.5, 1e-12);
  // state-vector result agrees with the analytic formula
  const s = new QState(1).apply(P.pulseUnitary({ duration: 3e-6, detuning: det }), [0]);
  close(s.prob1(0), P.excitedPopulation({ duration: 3e-6, detuning: det }), 1e-12);
});

test('the phase of the laser sets the rotation axis', () => {
  const half = P.piTime() / 2;
  const [x, y] = new QState(1).apply(P.pulseUnitary({ duration: half, phase: 0 }), [0]).bloch(0);
  close(x, 0, 1e-12); close(y, -1, 1e-12);
  const [x2, y2] = new QState(1).apply(P.pulseUnitary({ duration: half, phase: Math.PI / 2 }), [0]).bloch(0);
  close(x2, 1, 1e-12); close(y2, 0, 1e-12);
});

test('compiled H equals the ideal H, compiled X equals X', () => {
  assert.ok(G.equalUpToPhase(P.sequenceUnitary(P.compileGate(cal, 'H'), cal), G.H()));
  assert.ok(G.equalUpToPhase(P.sequenceUnitary(P.compileGate(cal, 'X'), cal), G.X()));
  close(P.xGateFidelity(cal), 1, 1e-12);
});

test('a miscalibrated π pulse has lower X-gate fidelity', () => {
  const bad = { ...cal, tPi: cal.tPi * 0.9 };
  const f = P.xGateFidelity(bad);
  assert.ok(f < 1 && f > 0.9, `fidelity ${f}`);
  close(f, Math.cos(0.05 * Math.PI) ** 2, 1e-9);
});
