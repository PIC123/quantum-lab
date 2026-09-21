import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../site/labs/core/cooling.js';
import { DOPPLER_LIMIT_K } from '../site/labs/core/constants.js';
import { close } from './helpers.js';

test('the Doppler limit for Ca+ at 397 nm is about 0.5 mK', () => {
  close(DOPPLER_LIMIT_K, 0.52e-3, 0.03e-3);
});

test('equilibrium temperature: minimum at Δ = −Γ/2 for low power, equal to the Doppler limit', () => {
  const s = 1e-3;
  const tHalf = C.equilibriumTemperature(-C.GAMMA / 2, s);
  close(tHalf, DOPPLER_LIMIT_K, DOPPLER_LIMIT_K * 0.01);
  assert.ok(C.equilibriumTemperature(-C.GAMMA / 4, s) > tHalf);
  assert.ok(C.equilibriumTemperature(-C.GAMMA, s) > tHalf);
  assert.equal(C.equilibriumTemperature(+C.GAMMA / 2, s), Infinity);
});

test('red detuning cools a hot ion to within 2× the Doppler limit', () => {
  const sim = new C.CoolingSim(1);
  for (let i = 0; i < 400; i++) sim.step(5e-6, -C.GAMMA / 2, 1);
  assert.ok(sim.temperature < 2 * DOPPLER_LIMIT_K, `T = ${sim.temperature}`);
  assert.ok(sim.temperature > 0.5 * DOPPLER_LIMIT_K, `T = ${sim.temperature}`);
});

test('blue detuning heats', () => {
  const sim = new C.CoolingSim(1e-3);
  for (let i = 0; i < 50; i++) sim.step(5e-6, +C.GAMMA / 2, 1);
  assert.ok(sim.temperature > 1e-3);
});

test('coolingPower is negative (cooling) for red detuning and positive for blue', () => {
  const E = 1.38e-23 * 0.01;
  assert.ok(C.coolingPower(E, -C.GAMMA / 2, 1).power < 0);
  assert.ok(C.coolingPower(E, +C.GAMMA / 2, 1).power > 0);
});
