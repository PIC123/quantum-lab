import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../site/labs/core/detection.js';
import { Rng } from '../site/labs/core/rng.js';
import { close } from './helpers.js';

test('photon means scale with detection time: 200 µs ⇒ ~10 bright, ~0.1 dark', () => {
  const m = D.photonMeans(200e-6);
  close(m.bright, 10); close(m.dark, 0.1);
});

test('Poisson pmf sums to one and cdf is monotone', () => {
  let s = 0;
  for (let k = 0; k < 60; k++) s += D.poissonPmf(k, 10);
  close(s, 1, 1e-9);
  assert.ok(D.poissonCdf(3, 10) < D.poissonCdf(4, 10));
  close(D.poissonPmf(0, 2), Math.exp(-2), 1e-12);
});

test('longer detection improves the best accuracy; 200 µs reaches > 99 %', () => {
  const a50 = D.bestThreshold(50e-6).accuracy;
  const a200 = D.bestThreshold(200e-6).accuracy;
  const a500 = D.bestThreshold(500e-6).accuracy;
  assert.ok(a50 < a200 && a200 < a500);
  assert.ok(a200 > 0.99, `accuracy ${a200}`);
  assert.ok(a50 < 0.99, `accuracy ${a50}`);
});

test('a bad threshold is worse than the best one', () => {
  const t = 200e-6;
  const best = D.bestThreshold(t);
  assert.ok(D.expectedAccuracy(0, t) < best.accuracy);
  assert.ok(D.expectedAccuracy(15, t) < best.accuracy);
});

test('simulated shots agree with the expected accuracy', () => {
  const t = 200e-6, rng = new Rng(3);
  const { counts, truth } = D.simulateShots(0.5, 4000, t, rng);
  const th = D.bestThreshold(t).threshold;
  const guess = D.classify(counts, th);
  let ok = 0;
  for (let i = 0; i < counts.length; i++) if (guess[i] === truth[i]) ok++;
  close(ok / counts.length, D.expectedAccuracy(th, t), 0.01);
  const h = D.histogram(counts);
  assert.equal(h.reduce((a, b) => a + b, 0), 4000);
});
