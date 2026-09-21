// Seeded random numbers so that every "shot" in the lab is reproducible.

/**
 * mulberry32: small, fast, good enough for sampling measurement outcomes.
 * @param {number} seed 32-bit integer
 * @returns {() => number} uniform in [0, 1)
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  /** @param {number} [seed] */
  constructor(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
    this.seed = seed >>> 0;
    this.uniform = mulberry32(this.seed);
  }

  /** Uniform float in [0, 1). */
  next() { return this.uniform(); }

  /** Integer in [0, n). */
  int(n) { return Math.floor(this.uniform() * n); }

  /** Standard normal via Box-Muller. */
  normal(mean = 0, sd = 1) {
    let u = 0;
    while (u === 0) u = this.uniform();
    const v = this.uniform();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Poisson-distributed integer with mean lambda.
   * Knuth's method below 60; normal approximation above (never more than a
   * few percent off there and never used for the small counts the lab shows).
   */
  poisson(lambda) {
    if (lambda <= 0) return 0;
    if (lambda < 60) {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do { k++; p *= this.uniform(); } while (p > L);
      return k - 1;
    }
    return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
  }

  /** Bernoulli trial. */
  chance(p) { return this.uniform() < p; }
}
