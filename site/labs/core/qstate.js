// Pure state of 1-3 qubits with gate application, Bloch vectors and
// seeded measurement sampling.
//
// Qubit 0 is the leftmost label in |q0 q1 q2⟩ and the most significant bit
// of the amplitude index, so |01⟩ (q0=0, q1=1) has index 1.

import { dim } from './gates.js';

export class QState {
  /** @param {number} n number of qubits (1..3) */
  constructor(n = 1) {
    if (n < 1 || n > 4) throw new Error('QState supports 1-4 qubits');
    this.n = n;
    this.size = 1 << n;
    this.re = new Float64Array(this.size);
    this.im = new Float64Array(this.size);
    this.re[0] = 1;
  }

  /** Bit mask for qubit k. */
  mask(k) { return 1 << (this.n - 1 - k); }

  reset() { this.re.fill(0); this.im.fill(0); this.re[0] = 1; return this; }

  clone() {
    const s = new QState(this.n);
    s.re.set(this.re); s.im.set(this.im);
    return s;
  }

  /** Set to a computational basis state given as a bit string like '01'. */
  setBasis(bits) {
    if (bits.length !== this.n) throw new Error('bit string length mismatch');
    this.re.fill(0); this.im.fill(0);
    this.re[parseInt(bits, 2)] = 1;
    return this;
  }

  /** Set from arrays of [re, im] amplitudes; normalises. */
  setAmplitudes(amps) {
    if (amps.length !== this.size) throw new Error('amplitude count mismatch');
    let norm = 0;
    amps.forEach(([r, i], k) => { this.re[k] = r; this.im[k] = i; norm += r * r + i * i; });
    const s = 1 / Math.sqrt(norm);
    for (let k = 0; k < this.size; k++) { this.re[k] *= s; this.im[k] *= s; }
    return this;
  }

  /**
   * Apply a gate matrix to the given qubits (in the matrix's own order).
   * @param {{n:number,re:Float64Array,im:Float64Array}} g
   * @param {number[]} qubits
   */
  apply(g, qubits) {
    if (g.n !== qubits.length) throw new Error(`gate acts on ${g.n} qubits, got ${qubits.length}`);
    if (g.n === 1) return this.#apply1(g, qubits[0]);
    if (g.n === 2) return this.#apply2(g, qubits[0], qubits[1]);
    throw new Error('only 1- and 2-qubit gates are supported');
  }

  #apply1(g, k) {
    const m = this.mask(k);
    const { re, im } = this;
    const a = g.re, b = g.im;
    for (let i = 0; i < this.size; i++) {
      if (i & m) continue;
      const j = i | m;
      const r0 = re[i], i0 = im[i], r1 = re[j], i1 = im[j];
      re[i] = a[0] * r0 - b[0] * i0 + a[1] * r1 - b[1] * i1;
      im[i] = a[0] * i0 + b[0] * r0 + a[1] * i1 + b[1] * r1;
      re[j] = a[2] * r0 - b[2] * i0 + a[3] * r1 - b[3] * i1;
      im[j] = a[2] * i0 + b[2] * r0 + a[3] * i1 + b[3] * r1;
    }
    return this;
  }

  #apply2(g, k1, k2) {
    if (k1 === k2) throw new Error('two-qubit gate needs distinct qubits');
    const m1 = this.mask(k1), m2 = this.mask(k2);
    const { re, im } = this;
    const a = g.re, b = g.im;
    const vr = new Float64Array(4), vi = new Float64Array(4);
    for (let i = 0; i < this.size; i++) {
      if (i & (m1 | m2)) continue;
      const idx = [i, i | m2, i | m1, i | m1 | m2]; // (k1 k2) = 00, 01, 10, 11
      for (let r = 0; r < 4; r++) { vr[r] = re[idx[r]]; vi[r] = im[idx[r]]; }
      for (let r = 0; r < 4; r++) {
        let sr = 0, si = 0;
        for (let c = 0; c < 4; c++) {
          const gr = a[r * 4 + c], gi = b[r * 4 + c];
          sr += gr * vr[c] - gi * vi[c];
          si += gr * vi[c] + gi * vr[c];
        }
        re[idx[r]] = sr; im[idx[r]] = si;
      }
    }
    return this;
  }

  /** Probability of each computational basis state. */
  probabilities() {
    const p = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) p[i] = this.re[i] ** 2 + this.im[i] ** 2;
    return p;
  }

  /** Probability that qubit k reads 1. */
  prob1(k) {
    const m = this.mask(k);
    let p = 0;
    for (let i = 0; i < this.size; i++) if (i & m) p += this.re[i] ** 2 + this.im[i] ** 2;
    return p;
  }

  /** Reduced Bloch vector [x, y, z] of qubit k (length < 1 when entangled). */
  bloch(k) {
    const m = this.mask(k);
    let r01r = 0, r01i = 0, p0 = 0, p1 = 0;
    for (let i = 0; i < this.size; i++) {
      if (i & m) continue;
      const j = i | m;
      // rho01 += psi_i * conj(psi_j)
      r01r += this.re[i] * this.re[j] + this.im[i] * this.im[j];
      r01i += this.im[i] * this.re[j] - this.re[i] * this.im[j];
      p0 += this.re[i] ** 2 + this.im[i] ** 2;
      p1 += this.re[j] ** 2 + this.im[j] ** 2;
    }
    return [2 * r01r, -2 * r01i, p0 - p1];
  }

  /** |⟨other|this⟩|². */
  fidelity(other) {
    if (other.size !== this.size) throw new Error('size mismatch');
    let r = 0, i = 0;
    for (let k = 0; k < this.size; k++) {
      r += other.re[k] * this.re[k] + other.im[k] * this.im[k];
      i += other.re[k] * this.im[k] - other.im[k] * this.re[k];
    }
    return r * r + i * i;
  }

  /**
   * Sample `shots` full measurements in the computational basis.
   * @returns {Uint32Array} counts per basis index
   */
  sample(shots, rng) {
    const p = this.probabilities();
    const cdf = new Float64Array(this.size);
    let acc = 0;
    for (let i = 0; i < this.size; i++) { acc += p[i]; cdf[i] = acc; }
    const counts = new Uint32Array(this.size);
    for (let s = 0; s < shots; s++) {
      const u = rng.next() * acc;
      let lo = 0, hi = this.size - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] > u) hi = mid; else lo = mid + 1; }
      counts[lo]++;
    }
    return counts;
  }

  /** One measurement outcome as an index; the state is NOT collapsed. */
  sampleOne(rng) {
    const u = rng.next();
    let acc = 0;
    for (let i = 0; i < this.size; i++) { acc += this.re[i] ** 2 + this.im[i] ** 2; if (u < acc) return i; }
    return this.size - 1;
  }

  /**
   * Measure qubit k, collapse the state, and return the outcome (0 or 1).
   */
  measure(k, rng) {
    const p1 = this.prob1(k);
    const outcome = rng.next() < p1 ? 1 : 0;
    this.collapse(k, outcome);
    return outcome;
  }

  /** Project qubit k onto `outcome` and renormalise. */
  collapse(k, outcome) {
    const m = this.mask(k);
    let norm = 0;
    for (let i = 0; i < this.size; i++) {
      const bit = (i & m) ? 1 : 0;
      if (bit !== outcome) { this.re[i] = 0; this.im[i] = 0; }
      else norm += this.re[i] ** 2 + this.im[i] ** 2;
    }
    const s = norm > 0 ? 1 / Math.sqrt(norm) : 0;
    for (let i = 0; i < this.size; i++) { this.re[i] *= s; this.im[i] *= s; }
    return this;
  }

  /** Human-readable ket, e.g. "0.71|0⟩ + 0.71i|1⟩". */
  toString(digits = 2) {
    const terms = [];
    for (let i = 0; i < this.size; i++) {
      const r = this.re[i], im = this.im[i];
      if (Math.abs(r) < 1e-9 && Math.abs(im) < 1e-9) continue;
      const label = i.toString(2).padStart(this.n, '0');
      let amp;
      if (Math.abs(im) < 1e-9) amp = r.toFixed(digits);
      else if (Math.abs(r) < 1e-9) amp = `${im.toFixed(digits)}i`;
      else amp = `(${r.toFixed(digits)}${im < 0 ? '−' : '+'}${Math.abs(im).toFixed(digits)}i)`;
      terms.push(`${amp}|${label}⟩`);
    }
    return terms.join(' + ').replace(/\+ -/g, '− ');
  }
}

/** Basis-state label for an index. */
export const label = (index, n) => index.toString(2).padStart(n, '0');

/** Fidelity of a two-qubit state with the Bell state (|00⟩ + e^{iχ}|11⟩)/√2, maximised over χ. */
export function bellFidelity(state) {
  if (state.n !== 2) throw new Error('bellFidelity needs 2 qubits');
  // |⟨Φ_χ|ψ⟩|² = ½ |ψ00 + e^{-iχ} ψ11|², max over χ = ½ (|ψ00| + |ψ11|)²
  const a = Math.hypot(state.re[0], state.im[0]);
  const b = Math.hypot(state.re[3], state.im[3]);
  return 0.5 * (a + b) ** 2;
}

export { dim };
