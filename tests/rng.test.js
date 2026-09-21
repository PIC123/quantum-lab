import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../site/labs/core/rng.js';
import { close } from './helpers.js';

test('seeded sequences repeat', () => {
  const a = new Rng(123), b = new Rng(123);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('poisson and normal have the right means', () => {
  const r = new Rng(5);
  let s = 0;
  for (let i = 0; i < 20000; i++) s += r.poisson(3.5);
  close(s / 20000, 3.5, 0.05);
  s = 0;
  for (let i = 0; i < 20000; i++) s += r.normal(2, 1);
  close(s / 20000, 2, 0.05);
  s = 0;
  for (let i = 0; i < 2000; i++) s += r.poisson(80);
  close(s / 2000, 80, 1);
});
