import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../site/labs/core/gates.js';
import { close } from './helpers.js';

test('X·X, H·H, Z·Z are the identity', () => {
  for (const g of [G.X, G.H, G.Z, G.Y]) assert.ok(G.equalUpToPhase(G.mul(g(), g()), G.I()));
});

test('S·S = Z and T·T = S', () => {
  assert.ok(G.equalUpToPhase(G.mul(G.S(), G.S()), G.Z()));
  assert.ok(G.equalUpToPhase(G.mul(G.T(), G.T()), G.S()));
});

test('rotations by π reproduce Pauli gates up to phase', () => {
  assert.ok(G.equalUpToPhase(G.RX(Math.PI), G.X()));
  assert.ok(G.equalUpToPhase(G.RY(Math.PI), G.Y()));
  assert.ok(G.equalUpToPhase(G.RZ(Math.PI), G.Z()));
});

test('R(θ, φ) matches RX and RY at φ = 0 and π/2', () => {
  assert.ok(G.equalUpToPhase(G.R(1.1, 0), G.RX(1.1)));
  assert.ok(G.equalUpToPhase(G.R(1.1, Math.PI / 2), G.RY(1.1)));
});

test('H = Ry(π/2)·Z up to phase', () => {
  assert.ok(G.equalUpToPhase(G.mul(G.RY(Math.PI / 2), G.Z()), G.H()));
});

test('unitarity: U†U = I for random rotations', () => {
  for (let i = 0; i < 10; i++) {
    const nx = Math.random() - 0.5, ny = Math.random() - 0.5, nz = Math.random() - 0.5;
    const n = Math.hypot(nx, ny, nz);
    const U = G.rotation(nx / n, ny / n, nz / n, Math.random() * 6);
    const P = G.mul(G.dagger(U), U);
    for (let k = 0; k < 4; k++) {
      close(P.re[k], k === 0 || k === 3 ? 1 : 0, 1e-12);
      close(P.im[k], 0, 1e-12);
    }
  }
});

test('kron gives the right size and CNOT ≠ I⊗X', () => {
  const IX = G.kron(G.I(), G.X());
  assert.equal(IX.n, 2);
  assert.ok(!G.equalUpToPhase(IX, G.CNOT()));
  assert.ok(G.equalUpToPhase(G.kron(G.H(), G.H()), G.mul(G.kron(G.H(), G.I()), G.kron(G.I(), G.H()))));
});

test('CZ = (I⊗H)·CNOT·(I⊗H)', () => {
  const IH = G.kron(G.I(), G.H());
  assert.ok(G.equalUpToPhase(G.mul(IH, G.mul(G.CNOT(), IH)), G.CZ()));
});

test('MS(π/2) is the fully entangling gate and MS(π)·MS(π) ∝ I', () => {
  const ms = G.MS(Math.PI / 2);
  // exp(-iπ/4 XX) squared = exp(-iπ/2 XX) = -i XX
  const sq = G.mul(ms, ms);
  assert.ok(G.equalUpToPhase(sq, G.kron(G.X(), G.X())));
  assert.ok(G.equalUpToPhase(G.mul(G.MS(Math.PI), G.MS(Math.PI)), G.identity(2)));
});

test('CNOT from MS with the Maslov decomposition', () => {
  const half = Math.PI / 2;
  const A = G.kron(G.RY(half), G.I());
  const B = G.kron(G.RX(-half), G.RX(-half));
  const C = G.MS(half, 0);
  const D = G.kron(G.RY(-half), G.I());
  const U = G.mul(D, G.mul(C, G.mul(B, A)));
  assert.ok(G.equalUpToPhase(U, G.CNOT()));
});

test('processFidelity is 1 for equal gates and 0.5 for X vs RX(π/2)', () => {
  close(G.processFidelity(G.X(), G.X()), 1);
  close(G.processFidelity(G.X(), G.RX(Math.PI / 2)), 0.5);
  close(G.processFidelity(G.X(), G.I()), 0);
});
