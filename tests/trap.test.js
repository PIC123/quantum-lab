import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../site/labs/core/trap.js';
import { close } from './helpers.js';

test('Mathieu stability on the a = 0 axis: stable below q ≈ 0.908, unstable above', () => {
  assert.ok(T.isStable(0, 0.3));
  assert.ok(T.isStable(0, 0.85));
  assert.ok(!T.isStable(0, 0.95));
  assert.ok(!T.isStable(0, 1.2));
  // boundary within 1 %
  assert.ok(T.mathieuStable(0, 0.90) && !T.mathieuStable(0, 0.915));
});

test('a negative a (endcap anti-confinement) needs enough q to stay stable', () => {
  assert.ok(!T.isStable(-0.05, 0.1));
  assert.ok(T.isStable(-0.05, 0.5));
});

test('mathieuParams gives realistic numbers for a small Ca+ trap', () => {
  const { a, q } = T.mathieuParams({ vRf: 400, fRf: 20e6, uDc: 0 });
  assert.ok(q > 0.3 && q < 0.7, `q = ${q}`);
  close(a, 0);
  const { a: a2 } = T.mathieuParams({ vRf: 400, fRf: 20e6, uDc: 50 });
  assert.ok(a2 < 0 && a2 > -0.1, `a = ${a2}`);
});

test('secular frequency grows with q', () => {
  const f1 = T.secularFrequency(0, 0.2, 20e6), f2 = T.secularFrequency(0, 0.5, 20e6);
  assert.ok(f2 > f1 && f1 > 0);
});

test('stability map has a stable region that shrinks as |a| grows', () => {
  const m = T.stabilityMap(24, 16);
  const row = (a) => {
    const i = Math.floor(((a - m.aMin) / (m.aMax - m.aMin)) * m.na);
    let n = 0;
    for (let j = 0; j < m.nq; j++) n += m.cells[i * m.nq + j];
    return n;
  };
  assert.ok(row(0) > 0);
  assert.ok(row(-0.3) < row(0));
});

test('IonMotion stays bounded when stable and escapes when unstable', () => {
  const stable = new T.IonMotion();
  for (let i = 0; i < 4000; i++) stable.step(0, 0.4, 0.1);
  assert.ok(!stable.escaped);
  assert.ok(Math.hypot(stable.x, stable.y) < 0.6);
  const unstable = new T.IonMotion();
  for (let i = 0; i < 4000 && !unstable.escaped; i++) unstable.step(0, 1.0, 0.1);
  assert.ok(unstable.escaped);
});
