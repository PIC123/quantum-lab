import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as N from '../site/labs/core/noise.js';
import { idealCalibration } from '../site/labs/core/pulses.js';
import { Rng } from '../site/labs/core/rng.js';
import { close } from './helpers.js';

const cal = idealCalibration();

test('ideal Ramsey fringe: P(1) = ½(1 + cos φ) and full contrast', () => {
  close(N.ramseyContrast(1e-3, N.NO_NOISE), 1);
  close(N.ramseyProbability(0, 0, 0), 1);
  close(N.ramseyProbability(0, Math.PI, 0), 0);
  // sampled circuit agrees
  const p = N.ramseyAverage({ tau: 0, phase: Math.PI / 3, cal }, 4000, new Rng(5));
  close(p, 0.5 * (1 + Math.cos(Math.PI / 3)), 0.03);
});

test('detuning turns wait time into fringes', () => {
  const det = 2 * Math.PI * 10e3; // 10 kHz
  const tau = 50e-6;              // half a period → P(1) = 0
  close(N.ramseyProbability(tau, 0, det), 0, 1e-9);
  const p = N.ramseyAverage({ tau, phase: 0, detuning: det, cal }, 2000, new Rng(9));
  close(p, 0, 0.03);
});

test('slow dephasing kills contrast; spin echo restores it', () => {
  const noise = { ...N.NO_NOISE, sigmaSlow: 2 * Math.PI * 5e3 };
  const tau = 100e-6;
  const C = N.ramseyContrast(tau, noise);
  assert.ok(C < 0.05, `contrast ${C}`);
  close(N.ramseyContrast(tau, noise, true), 1);
  // sampled: without echo the fringe is flat, with echo it is back
  const rng = new Rng(11);
  const flat = N.ramseyAverage({ tau, phase: 0, cal, noise }, 3000, rng);
  const echo = N.ramseyAverage({ tau, phase: 0, cal, noise, echo: true }, 3000, rng);
  close(flat, 0.5, 0.05);
  close(echo, 1, 0.03);
});

test('fast dephasing (T2) is not helped by an echo', () => {
  const noise = { ...N.NO_NOISE, t2: 50e-6 };
  const tau = 100e-6;
  close(N.ramseyContrast(tau, noise), Math.exp(-2), 1e-12);
  close(N.ramseyContrast(tau, noise, true), Math.exp(-2), 1e-12);
  const rng = new Rng(13);
  const p = N.ramseyAverage({ tau, phase: 0, cal, noise, echo: true }, 4000, rng);
  close(p, 0.5 * (1 + Math.exp(-2)), 0.04);
});

test('fitContrast recovers a known contrast from a sampled fringe', () => {
  const phases = Array.from({ length: 16 }, (_, i) => (2 * Math.PI * i) / 16);
  const probs = phases.map((ph) => 0.5 * (1 + 0.6 * Math.cos(ph + 0.4)));
  close(N.fitContrast(phases, probs), 0.6, 1e-9);
});
