// State detection by fluorescence. In |0⟩ (S1/2) the ion scatters 397 nm
// light and looks bright; in |1⟩ (D5/2) it is dark. Photon counts in a
// detection window are Poisson distributed, so one shot is noisy and only
// many shots give a probability.

/** Default rates: bright ≈ 50 photons/ms collected, dark ≈ 0.5/ms (background). */
export const DEFAULT_DETECTION = {
  brightRate: 50e3,   // photons per second reaching the detector in the bright state
  darkRate: 0.5e3,    // photons per second in the dark state (stray light, dark counts)
};

/** Mean photon numbers for a detection window, seconds. */
export function photonMeans(tDetect, cfg = DEFAULT_DETECTION) {
  return { bright: cfg.brightRate * tDetect, dark: cfg.darkRate * tDetect };
}

/** Poisson probability mass. */
export function poissonPmf(k, lambda) {
  if (lambda === 0) return k === 0 ? 1 : 0;
  // log form to avoid overflow for larger k
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

/** P(N ≤ k) for a Poisson variable. */
export function poissonCdf(k, lambda) {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poissonPmf(i, lambda);
  return Math.min(1, s);
}

/**
 * Expected accuracy of the rule "counts > threshold ⇒ bright", assuming
 * bright and dark are equally likely.
 * @param {number} threshold integer; counts strictly above it read bright
 */
export function expectedAccuracy(threshold, tDetect, cfg = DEFAULT_DETECTION) {
  const { bright, dark } = photonMeans(tDetect, cfg);
  const missBright = poissonCdf(threshold, bright);       // bright read as dark
  const falseBright = 1 - poissonCdf(threshold, dark);    // dark read as bright
  return 1 - 0.5 * (missBright + falseBright);
}

/** Threshold that maximises expected accuracy for a window. */
export function bestThreshold(tDetect, cfg = DEFAULT_DETECTION) {
  const { bright } = photonMeans(tDetect, cfg);
  let best = 0, bestAcc = 0;
  for (let th = 0; th <= Math.ceil(bright) + 5; th++) {
    const acc = expectedAccuracy(th, tDetect, cfg);
    if (acc > bestAcc) { bestAcc = acc; best = th; }
  }
  return { threshold: best, accuracy: bestAcc };
}

/**
 * Simulate photon counts for `shots` detections of a qubit that is bright
 * with probability pBright.
 * @returns {{counts:Uint16Array, truth:Uint8Array}} truth: 1 = was bright
 */
export function simulateShots(pBright, shots, tDetect, rng, cfg = DEFAULT_DETECTION) {
  const { bright, dark } = photonMeans(tDetect, cfg);
  const counts = new Uint16Array(shots);
  const truth = new Uint8Array(shots);
  for (let s = 0; s < shots; s++) {
    const isBright = rng.chance(pBright);
    truth[s] = isBright ? 1 : 0;
    counts[s] = rng.poisson(isBright ? bright : dark);
  }
  return { counts, truth };
}

/** Histogram of counts: array indexed by photon number. */
export function histogram(counts, maxBin = 40) {
  const h = new Uint32Array(maxBin + 1);
  for (const c of counts) h[Math.min(c, maxBin)]++;
  return h;
}

/** Classify counts with a threshold: 1 = bright. */
export function classify(counts, threshold) {
  const out = new Uint8Array(counts.length);
  for (let i = 0; i < counts.length; i++) out[i] = counts[i] > threshold ? 1 : 0;
  return out;
}
