// Complex matrices for 1- and 2-qubit gates. A matrix is {n, re, im} with
// n = number of qubits it acts on and re/im row-major Float64Arrays of
// length 4^n. Hand-written on purpose: at 1-3 qubits nothing more is needed.

/** @typedef {{n:number, re:Float64Array, im:Float64Array}} Matrix */

/**
 * Build a matrix from rows of [re, im] pairs (or plain numbers for reals).
 * @param {Array<Array<number|[number,number]>>} rows
 * @returns {Matrix}
 */
export function mat(rows) {
  const dim = rows.length;
  const n = Math.log2(dim);
  if (!Number.isInteger(n)) throw new Error('matrix dimension must be a power of 2');
  const re = new Float64Array(dim * dim);
  const im = new Float64Array(dim * dim);
  rows.forEach((row, r) => {
    if (row.length !== dim) throw new Error('matrix must be square');
    row.forEach((v, c) => {
      if (typeof v === 'number') { re[r * dim + c] = v; }
      else { re[r * dim + c] = v[0]; im[r * dim + c] = v[1]; }
    });
  });
  return { n, re, im };
}

/** Dimension of a matrix. */
export const dim = (m) => 1 << m.n;

/** Matrix product A·B (same size). */
export function mul(A, B) {
  if (A.n !== B.n) throw new Error('size mismatch');
  const d = dim(A);
  const re = new Float64Array(d * d);
  const im = new Float64Array(d * d);
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      let sr = 0, si = 0;
      for (let k = 0; k < d; k++) {
        const ar = A.re[r * d + k], ai = A.im[r * d + k];
        const br = B.re[k * d + c], bi = B.im[k * d + c];
        sr += ar * br - ai * bi;
        si += ar * bi + ai * br;
      }
      re[r * d + c] = sr;
      im[r * d + c] = si;
    }
  }
  return { n: A.n, re, im };
}

/** Conjugate transpose. */
export function dagger(A) {
  const d = dim(A);
  const re = new Float64Array(d * d);
  const im = new Float64Array(d * d);
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      re[c * d + r] = A.re[r * d + c];
      im[c * d + r] = -A.im[r * d + c];
    }
  }
  return { n: A.n, re, im };
}

/** Kronecker product A ⊗ B. */
export function kron(A, B) {
  const da = dim(A), db = dim(B), d = da * db;
  const re = new Float64Array(d * d);
  const im = new Float64Array(d * d);
  for (let ar = 0; ar < da; ar++) for (let ac = 0; ac < da; ac++) {
    const xr = A.re[ar * da + ac], xi = A.im[ar * da + ac];
    for (let br = 0; br < db; br++) for (let bc = 0; bc < db; bc++) {
      const yr = B.re[br * db + bc], yi = B.im[br * db + bc];
      const r = ar * db + br, c = ac * db + bc;
      re[r * d + c] = xr * yr - xi * yi;
      im[r * d + c] = xr * yi + xi * yr;
    }
  }
  return { n: A.n + B.n, re, im };
}

/** True if A and B are equal up to a global phase, within tol. */
export function equalUpToPhase(A, B, tol = 1e-9) {
  if (A.n !== B.n) return false;
  const d = dim(A);
  // Find the largest entry of B to fix the phase.
  let best = 0, bi = 0;
  for (let i = 0; i < d * d; i++) {
    const m = B.re[i] * B.re[i] + B.im[i] * B.im[i];
    if (m > best) { best = m; bi = i; }
  }
  if (best < tol) return false;
  // phase = A[bi] / B[bi]
  const br = B.re[bi], bim = B.im[bi];
  const ar = A.re[bi], aim = A.im[bi];
  const den = br * br + bim * bim;
  const pr = (ar * br + aim * bim) / den;
  const pi = (aim * br - ar * bim) / den;
  if (Math.abs(pr * pr + pi * pi - 1) > 1e-6) return false;
  for (let i = 0; i < d * d; i++) {
    const er = pr * B.re[i] - pi * B.im[i];
    const ei = pr * B.im[i] + pi * B.re[i];
    if (Math.abs(er - A.re[i]) > tol || Math.abs(ei - A.im[i]) > tol) return false;
  }
  return true;
}

/** Process fidelity between two unitaries: |Tr(U†V)|² / d². */
export function processFidelity(U, V) {
  const P = mul(dagger(U), V);
  const d = dim(U);
  let tr = 0, ti = 0;
  for (let i = 0; i < d; i++) { tr += P.re[i * d + i]; ti += P.im[i * d + i]; }
  return (tr * tr + ti * ti) / (d * d);
}

// ---- single-qubit gates -------------------------------------------------

export const I = () => mat([[1, 0], [0, 1]]);
export const X = () => mat([[0, 1], [1, 0]]);
export const Y = () => mat([[0, [0, -1]], [[0, 1], 0]]);
export const Z = () => mat([[1, 0], [0, -1]]);
export const H = () => { const s = Math.SQRT1_2; return mat([[s, s], [s, -s]]); };
export const S = () => mat([[1, 0], [0, [0, 1]]]);
export const Sdg = () => mat([[1, 0], [0, [0, -1]]]);
export const T = () => mat([[1, 0], [0, [Math.SQRT1_2, Math.SQRT1_2]]]);

/**
 * Rotation by angle theta about the unit axis (nx, ny, nz) on the Bloch
 * sphere: U = cos(θ/2) I − i sin(θ/2) (n·σ).
 */
export function rotation(nx, ny, nz, theta) {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  return mat([
    [[c, -s * nz], [-s * ny, -s * nx]],
    [[s * ny, -s * nx], [c, s * nz]],
  ]);
}

/** Rotation about an axis in the equatorial plane at azimuth phi. */
export const R = (theta, phi) => rotation(Math.cos(phi), Math.sin(phi), 0, theta);
export const RX = (theta) => rotation(1, 0, 0, theta);
export const RY = (theta) => rotation(0, 1, 0, theta);
export const RZ = (theta) => rotation(0, 0, 1, theta);

// ---- two-qubit gates ----------------------------------------------------

/** Controlled-NOT with qubit order (control, target). */
export const CNOT = () => mat([
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0],
]);

export const CZ = () => mat([
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, -1],
]);

export const SWAP = () => mat([
  [1, 0, 0, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 1],
]);

/**
 * Mølmer–Sørensen gate: exp(−i θ/2 σφ⊗σφ) with σφ = cos φ X + sin φ Y.
 * θ = π/2 is the fully entangling gate: |00⟩ → (|00⟩ − i|11⟩)/√2.
 */
export function MS(theta, phi = 0) {
  const sig = mat([[0, [Math.cos(phi), -Math.sin(phi)]], [[Math.cos(phi), Math.sin(phi)], 0]]);
  const XX = kron(sig, sig);
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  const re = new Float64Array(16), im = new Float64Array(16);
  for (let i = 0; i < 16; i++) {
    // c·I − i·s·XX  →  re = c·I_re + s·XX_im ; im = −s·XX_re
    re[i] = s * XX.im[i];
    im[i] = -s * XX.re[i];
  }
  for (let i = 0; i < 4; i++) re[i * 4 + i] += c;
  return { n: 2, re, im };
}

/** Identity on n qubits. */
export function identity(n) {
  const d = 1 << n;
  const re = new Float64Array(d * d), im = new Float64Array(d * d);
  for (let i = 0; i < d; i++) re[i * d + i] = 1;
  return { n, re, im };
}
