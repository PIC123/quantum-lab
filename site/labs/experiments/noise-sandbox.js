// Experiment 7 — Noise Sandbox.
// The Ramsey experiment from #5 with noise the student can turn up:
// slow magnetic-field dephasing, fast dephasing (T2), laser intensity
// flicker and motional heating, plus a spin-echo toggle that rescues the
// qubit from slow dephasing only.

import { el, slider, button, toggle, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import { idealCalibration } from '../core/pulses.js';
import * as N from '../core/noise.js';

export const meta = {
  id: 'noise-sandbox', number: 7, title: 'Noise Sandbox',
  concept: 'Decoherence and spin echo',
  mission: 'Rescue a qubit from dephasing',
};

const TAU_MAX = 400e-6;
const PHASES = Array.from({ length: 8 }, (_, i) => (2 * Math.PI * i) / 8);

export function create(ctx) {
  const { rng, store } = ctx;
  const rabi = ctx.machine.rabi;
  const cal = store.calibration?.tHalf ? store.calibration : idealCalibration(rabi);
  const noise = { sigmaSlow: 0, t2: Infinity, jitter: 0, heating: 0 };
  let echo = false;
  let tau = 200e-6;
  let busy = false;
  let scan = null;      // { points: [[tau_us, contrast]], noise, echo }
  let fringe = null;    // { tau, points }

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const beams = { qubit: { id: '729', on: 0, label: '729 nm qubit laser' }, det: { id: '397', on: 0.3, label: '397 nm detection', angle: Math.PI / 5 } };
  lab.setBeams([beams.det, beams.qubit]);
  const ion = { x: 0, glow: 0.6, label: '40Ca+', dx: 0, dy: 0 };
  lab.setIons([ion]); lab.setCamera(true, 0.6);
  let wobble = 0;

  const circuit = new CircuitView(ctx.card('Circuit'), { qubits: 1, labels: ['|0⟩'] });
  const plot = new Plot(ctx.card('Fringe contrast vs wait time'), { label: 'Contrast versus wait time' });
  const fringePlot = new Plot(ctx.card('Fringe at the chosen wait time', { depth: 'understand' }), { label: 'Ramsey fringe' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roC = readout(`Model contrast at ${fmt.us(tau, 0)}`); const roT2 = readout('Effective T2*');
  nums.append(roC.el, roT2.el);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  // ---- controls ----
  const bSlider = slider({ id: 'bnoise', label: 'Magnetic-field noise (slow)', min: 0, max: 20, step: 1, value: 0, format: (v) => `${v} kHz`, onInput: (v) => { noise.sigmaSlow = 2 * Math.PI * v * 1e3; update(); } });
  const fastSlider = slider({ id: 'fast', label: 'Fast noise (T2)', min: 0, max: 10, step: 1, value: 0, format: (v) => (v === 0 ? 'off' : `T2 = ${Math.round(1000 / v)} µs`), onInput: (v) => { noise.t2 = v === 0 ? Infinity : 1e-3 / v; update(); } });
  const jitterSlider = slider({ id: 'jitter', label: 'Laser intensity flicker', min: 0, max: 20, step: 1, value: 0, format: (v) => `${v} %`, onInput: (v) => { noise.jitter = v / 100; update(); } });
  const heatSlider = slider({ id: 'heat', label: 'Motional heating', min: 0, max: 10, step: 1, value: 0, format: (v) => (v === 0 ? 'off' : `${v} /ms`), onInput: (v) => { noise.heating = v * 1e3; update(); } });
  const tauSlider = slider({ id: 'tau', label: 'Wait time for the fringe', min: 0, max: 400, step: 10, value: 200, format: (v) => `${v} µs`, onInput: (v) => { tau = v * 1e-6; update(); } });
  const echoToggle = toggle({ id: 'echo', label: 'Spin echo (π pulse halfway)', checked: false, onChange: (v) => { echo = v; update(); } });
  const scanBtn = button('Measure contrast vs wait time', doScan, { primary: true });
  const fringeBtn = button('Measure fringe at this wait', doFringe);
  const resetBtn = button('All noise off', () => { bSlider.set(0); fastSlider.set(0); jitterSlider.set(0); heatSlider.set(0); Object.assign(noise, { sigmaSlow: 0, t2: Infinity, jitter: 0, heating: 0 }); update(); });
  ctx.controls.append(
    el('div', { class: 'controls-grid' }, bSlider.el, fastSlider.el, jitterSlider.el, heatSlider.el),
    el('div', { class: 'controls-row' }, echoToggle.el, tauSlider.el),
    el('div', { class: 'controls-row' }, scanBtn, fringeBtn, resetBtn),
  );
  tauSlider.el.style.flex = '1';

  function update() {
    const C = N.ramseyContrast(tau, noise, echo);
    roC.set(fmt.pct(C, 0)); roC.setClass(C > 0.8 ? 'is-good' : C < 0.3 ? 'is-bad' : '');
    const t2star = noise.sigmaSlow ? Math.SQRT2 / noise.sigmaSlow : Infinity;
    roT2.set(Number.isFinite(t2star) ? fmt.us(t2star, 0) : '∞ (no slow noise)');
    circuit.setCircuit(echo
      ? [[{ q: 0, label: 'R(π/2)', kind: 'pulse' }], [{ q: 0, kind: 'wait', label: 'τ/2' }], [{ q: 0, label: 'Ry(π)', sub: 'echo', kind: 'pulse' }], [{ q: 0, kind: 'wait', label: 'τ/2' }], [{ q: 0, label: 'R(π/2)', sub: 'phase φ', kind: 'pulse' }], [{ q: 0, kind: 'measure' }]]
      : [[{ q: 0, label: 'R(π/2)', kind: 'pulse' }], [{ q: 0, kind: 'wait', label: 'τ' }], [{ q: 0, label: 'R(π/2)', sub: 'phase φ', kind: 'pulse' }], [{ q: 0, kind: 'measure' }]]);
    drawPlots();
    math.set([
      { title: 'Contrast model', html: `<span class="eq">C(τ) = e<sup>−(σ<sub>slow</sub>τ)²/2</sup> · e<sup>−τ/T2</sup> · e<sup>−hτ</sup> · (1 − π²σ<sub>Ω</sub>²/4)</span><span class="eq">echo: the first factor becomes 1 (slow noise cancels), the others stay.</span><span class="eq">P(1) = ½ (1 + C cos φ)</span>` },
      { title: 'Now', html: `<span class="eq">σ<sub>slow</sub> = 2π × ${fmt.khz(noise.sigmaSlow, 0)}, T2 = ${Number.isFinite(noise.t2) ? fmt.us(noise.t2, 0) : '∞'}, σ<sub>Ω</sub> = ${(noise.jitter * 100).toFixed(0)} %, h = ${noise.heating / 1e3} /ms, echo ${echo ? 'on' : 'off'}</span><div class="note">Slow noise: each shot sees a different frequency offset, constant during the shot. Fast noise: the phase diffuses during the shot. Heating is modelled as extra phase diffusion (a simplification of the Debye–Waller effect on the pulses).</div>` },
    ]);
    lab.setCaption(`Ramsey, wait ${fmt.us(tau, 0)}${echo ? ' with spin echo' : ''}.`);
    ctx.mission?.poll();
  }

  function drawPlots() {
    const series = [];
    if (scan) series.push({ name: `measured${scan.echo ? ' (echo)' : ''}`, kind: 'scatter', points: scan.points, color: scan.echo ? COLORS.success : COLORS.accent });
    if (ctx.depth !== 'explore' || scan) series.push({ name: 'model', points: Array.from({ length: 81 }, (_, i) => { const t = (i / 80) * TAU_MAX; return [t * 1e6, N.ramseyContrast(t, noise, echo)]; }), color: COLORS.muted, width: 1.5, dash: [4, 3] });
    plot.setData({ series, xLabel: 'wait time τ (µs)', yLabel: 'fringe contrast', xRange: [0, TAU_MAX * 1e6], yRange: [0, 1.05], vlines: [{ x: tau * 1e6, label: '', color: 'rgba(244,114,182,0.5)' }], hlines: [{ y: 0.8, label: 'target 0.8', color: COLORS.success }] });
    const fs = [];
    if (fringe) fs.push({ name: `measured at ${fmt.us(fringe.tau, 0)}`, kind: 'scatter', points: fringe.points, color: COLORS.accent2 });
    fs.push({ name: 'model', points: Array.from({ length: 73 }, (_, i) => { const ph = (i / 72) * 2 * Math.PI; return [(ph * 180) / Math.PI, N.ramseyProbability(tau, ph, 0, noise, echo)]; }), color: COLORS.muted, width: 1, dash: [4, 3] });
    fringePlot.setData({ series: fs, xLabel: 'phase of last pulse (°)', yLabel: 'P(dark)', xRange: [0, 360], yRange: [0, 1.05], vlines: [] });
  }

  async function doScan() {
    if (busy) return;
    busy = true; scanBtn.disabled = fringeBtn.disabled = true;
    const points = []; const per = 40;
    const snapshot = { ...noise }; const e = echo;
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * TAU_MAX;
      const probs = PHASES.map((ph) => N.ramseyAverage({ tau: t, phase: ph, cal, noise: snapshot, echo: e }, per, rng));
      points.push([t * 1e6, N.fitContrast(PHASES, probs)]);
      scan = { points, noise: snapshot, echo: e }; drawPlots();
      beams.qubit.on = 0.7; await ctx.animate({ duration: 70, onFrame: () => {} }); beams.qubit.on = 0;
    }
    store.log('scan', { experiment: meta.id, noise: snapshot, echo: e });
    busy = false; scanBtn.disabled = fringeBtn.disabled = false;
    update();
    ctx.mission?.event('scan', scan);
  }

  async function doFringe() {
    if (busy) return;
    busy = true; scanBtn.disabled = fringeBtn.disabled = true;
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const ph = (i / 24) * 2 * Math.PI;
      points.push([(ph * 180) / Math.PI, N.ramseyAverage({ tau, phase: ph, cal, noise, echo }, 50, rng)]);
      fringe = { tau, points }; drawPlots();
      beams.qubit.on = 0.7; await ctx.animate({ duration: 40, onFrame: () => {} }); beams.qubit.on = 0;
    }
    busy = false; scanBtn.disabled = fringeBtn.disabled = false;
    ctx.mission?.event('fringe', fringe);
  }

  const contrastAt = (s, tUs) => { const p = s.points.reduce((m, q) => (Math.abs(q[0] - tUs) < Math.abs(m[0] - tUs) ? q : m)); return p[1]; };
  const steps = [
    {
      id: 'baseline', kind: 'task', title: 'A quiet lab',
      text: 'This is the Ramsey experiment from experiment 5. With all noise off, press <b>Measure contrast vs wait time</b>.',
      check: () => !!scan && scan.noise.sigmaSlow === 0 && !Number.isFinite(scan.noise.t2) && scan.noise.jitter === 0 && scan.noise.heating === 0,
      doneText: 'Full contrast at every wait time.',
      doneDetail: 'With nothing disturbing it, the qubit keeps its phase for as long as we like. Real labs are not this quiet.',
    },
    {
      id: 'dephase', kind: 'task', title: 'Turn on the field noise',
      text: 'Set the <b>magnetic-field noise to 10 kHz</b> or more and measure again.',
      check: () => !!scan && scan.noise.sigmaSlow >= 2 * Math.PI * 8e3 && !scan.echo,
      doneText: 'The fringes wash out: dephasing.',
      doneDetail: 'A fluctuating field shifts the qubit frequency by a different amount each shot, so the phase accumulated during the wait is different each time. Averaged over shots, the fringe disappears. The qubit is not destroyed; the experiment has lost track of its phase.',
      why: 'The time it takes the contrast to fall to 1/e is called T2*. It is the first number an experimenter measures on a new qubit.',
    },
    {
      id: 'predict-echo', kind: 'predict', title: 'The spin echo',
      text: 'Turn on the <b>spin echo</b>: a π pulse halfway through the wait. With the same field noise, the contrast will…',
      options: ['Stay washed out', 'Come back', 'Get worse'],
      on: 'scan', afterLock: 'Turn on the echo and measure again.',
      resolve: (guess, _c, s) => (s.echo && s.noise.sigmaSlow >= 2 * Math.PI * 5e3 ? { correct: guess === 1, text: 'It comes back. The π pulse swaps the roles of |0⟩ and |1⟩ halfway, so whatever phase the qubit gained in the first half it loses in the second. As long as the noise is slow compared with the wait, the error cancels exactly.' } : null),
      why: 'Runners on a track run at different speeds, so they spread out. If at the halfway signal everyone turns around, they all arrive back at the start together, however different their speeds.',
    },
    {
      id: 'fast', kind: 'task', title: 'Noise the echo cannot fix',
      text: 'Keep the echo on and turn on <b>fast noise</b> (any T2 setting). Measure again.',
      check: () => !!scan && scan.echo && Number.isFinite(scan.noise.t2),
      doneText: 'Fast noise beats the echo.',
      doneDetail: 'If the field changes during the wait itself, the second half does not mirror the first, and the echo cannot undo it. The remaining decay time is called T2. Slow noise you can refocus; fast noise you must shield or avoid.',
    },
    {
      id: 'rescue', kind: 'task', title: 'Rescue mission',
      text: 'Field noise at <b>15 kHz</b>, fast noise off. Get the measured contrast at <b>200 µs</b> above <b>0.8</b>.',
      check: () => { const ok = !!scan && scan.noise.sigmaSlow >= 2 * Math.PI * 14e3 && !Number.isFinite(scan.noise.t2) && contrastAt(scan, 200) >= 0.8; return { done: ok, hint: scan && scan.noise.sigmaSlow >= 2 * Math.PI * 14e3 ? `Contrast at 200 µs: ${fmt.pct(contrastAt(scan, 200), 0)}` : 'Set field noise to 15 kHz first.' }; },
      doneText: 'Qubit rescued.',
      doneDetail: 'This is the simplest example of dynamical decoupling: a pulse sequence that cancels noise instead of fighting it. Real machines use trains of such pulses.',
    },
    {
      id: 'wrap', kind: 'info', title: 'Why quantum computers are hard',
      text: 'Every knob here is a real engineering problem: magnetic shielding, laser power stabilisation, trap heating rates. Echoes and calibration buy time; for long computations the remaining errors must be caught and corrected, which is what quantum error correction is for.',
      button: 'Finish mission',
    },
  ];

  update();
  return {
    steps,
    frame(dt) {
      wobble += dt;
      const amp = Math.min(0.5, noise.sigmaSlow / (2 * Math.PI * 40e3)) + noise.heating / 40e3;
      ion.dx = amp * Math.sin(wobble * 7) * (0.5 + 0.5 * Math.sin(wobble * 1.3));
      ion.dy = amp * 0.5 * Math.cos(wobble * 9.1);
      if (noise.jitter && beams.qubit.on) beams.qubit.on = 0.5 + 0.5 * Math.random();
      lab.tick(dt); lab.draw();
    },
    dispose() { lab.dispose(); plot.dispose(); fringePlot.dispose(); },
  };
}
