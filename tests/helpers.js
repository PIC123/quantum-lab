import assert from 'node:assert/strict';
export const close = (a, b, tol = 1e-9, msg) => assert.ok(Math.abs(a - b) <= tol, msg ?? `${a} != ${b} (tol ${tol})`);
