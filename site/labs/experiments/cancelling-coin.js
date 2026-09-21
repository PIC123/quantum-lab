// Experiment 5 — The Cancelling Coin.
// One π/2 pulse looks like a coin flip. Two of them do not give a coin
// flipped twice: they give a certain answer. Amplitudes add, probabilities
// do not. The Ramsey variant adds a wait and a phase knob for fringes.

import { el, slider, button, segmented, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { BlochSphere } from '../framework/views/bloch.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel, matrixHtml, ketHtml } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import { QState } from '../core/qstate.js';
import { pulseUnitary, idealCalibration } from '../core/pulses.js';
import { RZ, mul, rotation } from '../core/gates.js';

export const meta = {
  id: 'cancelling-coin', number: 5, title: 'The Cancelling Coin',
  concept: 'Superposition and interference',
  mission: 'Predict the double-flip outcome',
};

export function create(ctx) {
  const { rng, store } = ctx;
  const rabi = ctx.machine.rabi;
  const delta = ctx.machine.detuningOffset;           // small unknown qubit-laser frequency offset
  const cal = store.calibration?.tHalf ? store.calibration : idealCalibration(rabi);
  const usingOwn = !!store.calibration?.tHalf;
  let pulses = [{ phase: 0 }];                         // each entry is a π/2 pulse with a laser phase
  let wait = 0;                                        // seconds between the first and second pulse
  let shots = 100;
  let busy = false;
  let phaseScan = null, waitScan = null;
  const runs = [];

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const beams = { qubit: { id: '729', on: 0, label: '729 nm qubit laser' }, det: { id: '397', on: 0.3, label: '397 nm detection', angle: Math.PI / 5 } };
  lab.setBeams([beams.det, beams.qubit]);
  lab.setIons([{ x: 0, glow: 0.6, label: '40Ca+' }]); lab.setCamera(true, 0.6);

  const circuit = new CircuitView(ctx.card('Circuit', { help: 'tap a gate to remove it, + to add a π/2 pulse' }), { qubits: 1, labels: ['|0⟩'], editable: true });
  circuit.onGateClick = (i) => { if (busy) return; pulses.splice(i, 1); if (!pulses.length) pulses = [{ phase: 0 }]; syncControls(); update(); };
  circuit.onAdd = () => { if (busy || pulses.length >= 4) return; pulses.push({ phase: 0 }); syncControls(); update(); };
  const plot = new Plot(ctx.card('Fringes'), { label: 'Ramsey fringe plot' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roP1 = readout('Predicted P(dark)'); const roAmp = readout('Amplitudes  ⟨0|ψ⟩, ⟨1|ψ⟩'); const roCal = readout('Gates from', usingOwn ? `your calibration (π/2 = ${fmt.us(cal.tHalf, 2)})` : 'ideal gates (calibrate in experiment 4)');
  nums.append(roP1.el, roAmp.el, roCal.el);
  const bloch = new BlochSphere(ctx.card('Bloch sphere', { depth: 'understand' }));
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  // ---- controls ----
  const addBtn = button('+ π/2 pulse', () => circuit.onAdd());
  const removeBtn = button('− last pulse', () => { if (pulses.length > 1) circuit.onGateClick(pulses.length - 1); });
  const phaseSlider = slider({ id: 'phase', label: 'Phase of the last pulse', min: -180, max: 180, step: 5, value: 0, format: (v) => `${v}°`, onInput: (v) => { pulses[pulses.length - 1].phase = (v * Math.PI) / 180; update(); } });
  const waitSlider = slider({ id: 'wait', label: 'Wait between pulses', min: 0, max: 300, step: 5, value: 0, format: (v) => `${v} µs`, onInput: (v) => { wait = v * 1e-6; update(); } });
  const shotsSeg = segmented({ id: 'shots', label: 'Shots', options: [{ value: 1, label: '1 shot' }, { value: 100, label: '100 shots' }], value: 100, onChange: (v) => { shots = Number(v); } });
  const runBtn = button('Run sequence', run, { primary: true });
  const scanPhaseBtn = button('Scan phase', scanPhase);
  const scanWaitBtn = button('Scan wait time', scanWait);
  const roResult = readout('Last result', '—');
  ctx.controls.append(
    el('div', { class: 'controls-row' }, addBtn, removeBtn),
    el('div', { class: 'controls-grid' }, phaseSlider.el, waitSlider.el),
    el('div', { class: 'controls-row' }, runBtn, shotsSeg.el, scanPhaseBtn, scanWaitBtn),
    roResult.el,
  );
  function syncControls() { phaseSlider.set(Math.round((pulses[pulses.length - 1].phase * 180) / Math.PI)); removeBtn.disabled = pulses.length <= 1; addBtn.disabled = pulses.length >= 4; }

  // ---- physics ----
  const halfPulse = (phase) => pulseUnitary({ duration: cal.tHalf, phase, rabi });
  function stateFor(seq = pulses, tau = wait, upTo = seq.length, frac = 1) {
    const s = new QState(1);
    for (let i = 0; i < upTo; i++) {
      if (i === 1 && tau > 0) s.apply(RZ(delta * tau), [0]);
      const p = seq[i];
      s.apply(i === upTo - 1 && frac < 1 ? pulseUnitary({ duration: cal.tHalf * frac, phase: p.phase, rabi }) : halfPulse(p.phase), [0]);
    }
    return s;
  }
  function totalUnitary() {
    let U = rotation(1, 0, 0, 0);
    pulses.forEach((p, i) => { if (i === 1 && wait > 0) U = mul(RZ(delta * wait), U); U = mul(halfPulse(p.phase), U); });
    return U;
  }
  const columns = (active = -1) => {
    const cols = [];
    pulses.forEach((p, i) => {
      if (i === 1 && wait > 0) cols.push([{ q: 0, kind: 'wait', label: 'wait', sub: fmt.us(wait, 0), active: active === 0.5 }]);
      cols.push([{ q: 0, label: 'R(π/2)', sub: p.phase ? `φ = ${fmt.deg(p.phase)}` : 'φ = 0', kind: 'pulse', ref: i, active: active === i }]);
    });
    cols.push([{ q: 0, kind: 'measure', active: active === pulses.length }]);
    return cols;
  };

  function update() {
    const s = stateFor();
    const p1 = s.prob1(0);
    if (!busy) { bloch.setVector(s.bloch(0)); bloch.clearTrail(); bloch.setAxis([Math.cos(pulses[pulses.length - 1].phase), Math.sin(pulses[pulses.length - 1].phase), 0]); }
    circuit.setCircuit(columns());
    roP1.set(fmt.pct(p1, 1));
    roAmp.set(`${s.toString(2)}`);
    drawPlot();
    math.set([
      { title: 'Amplitudes add, probabilities do not', html: `<span class="eq">one π/2 pulse:  |0⟩ → (|0⟩ − i|1⟩)/√2,  P(1) = ½</span><span class="eq">two π/2 pulses: the two ways to end in |0⟩ (stay, stay) and (flip, flip) have amplitudes ½ and −½: they cancel. P(1) = 1.</span><span class="eq">with phase φ on the second pulse: P(1) = ½(1 + cos(φ + δτ))</span>` },
      { title: 'Total unitary of your sequence', html: matrixHtml(totalUnitary()) },
      { title: 'Final state', html: ketHtml(s) + `<div class="note">Qubit–laser offset δ = ${fmt.khz(delta, 2)} (unknown to you until you measure it), wait τ = ${fmt.us(wait, 0)}${usingOwn ? `, your π/2 pulse = ${fmt.us(cal.tHalf, 2)}` : ''}.</div>` },
    ]);
    lab.setCaption(`${pulses.length} × π/2 pulse${pulses.length > 1 ? 's' : ''}${wait ? `, wait ${fmt.us(wait, 0)}` : ''}. Ion ready in |0⟩.`);
    ctx.mission?.poll();
  }

  function drawPlot() {
    const series = [];
    if (phaseScan) {
      series.push({ name: `P(dark) vs phase (wait ${fmt.us(phaseScan.wait, 0)})`, kind: 'scatter', points: phaseScan.points, color: COLORS.accent });
      if (ctx.depth !== 'explore') series.push({ name: 'model', points: Array.from({ length: 73 }, (_, i) => { const ph = -Math.PI + (i / 72) * 2 * Math.PI; return [(ph * 180) / Math.PI, stateFor([{ phase: 0 }, { phase: ph }], phaseScan.wait).prob1(0)]; }), color: COLORS.muted, width: 1, dash: [4, 3] });
      plot.setData({ series, xLabel: 'phase of second pulse (°)', yLabel: 'P(dark)', xRange: [-180, 180], yRange: [0, 1.05], vlines: [] });
    } else if (waitScan) {
      series.push({ name: 'P(dark) vs wait (phase 0)', kind: 'scatter', points: waitScan.points, color: COLORS.accent2 });
      if (ctx.depth !== 'explore') series.push({ name: 'model', points: Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * 300e-6; return [t * 1e6, stateFor([{ phase: 0 }, { phase: 0 }], t).prob1(0)]; }), color: COLORS.muted, width: 1, dash: [4, 3] });
      plot.setData({ series, xLabel: 'wait between pulses (µs)', yLabel: 'P(dark)', xRange: [0, 300], yRange: [0, 1.05], vlines: [] });
    } else {
      const mine = runs.map((r) => [r.index, r.ones / r.shots]);
      plot.setData({ series: mine.length ? [{ name: 'your runs, in order', kind: 'scatter', points: mine, color: COLORS.accent2 }] : [], xLabel: 'run number', yLabel: 'P(dark)', xRange: [0, Math.max(10, runs.length + 1)], yRange: [0, 1.05], vlines: [] });
    }
  }

  async function run() {
    if (busy) return;
    busy = true; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = true;
    const p1 = stateFor().prob1(0);
    let ones = 0; for (let i = 0; i < shots; i++) if (rng.chance(p1)) ones++;
    beams.det.on = 0; lab.setIons([{ x: 0, glow: 0, label: '40Ca+' }]); lab.setCamera(true, 0);
    bloch.clearTrail();
    for (let i = 0; i < pulses.length; i++) {
      if (i === 1 && wait > 0) {
        circuit.setCircuit(columns(0.5));
        await ctx.animate({ duration: Math.min(900, 200 + wait * 1e6 * 2), ease: (t) => t, onFrame: (t) => { const s = stateFor(pulses, wait * t, 1); s.apply(RZ(0), [0]); bloch.setVector(s.bloch(0)); bloch.pushTrail(); } });
      }
      circuit.setCircuit(columns(i));
      bloch.setAxis([Math.cos(pulses[i].phase), Math.sin(pulses[i].phase), 0]);
      await ctx.animate({ duration: 380, ease: (t) => t, onFrame: (t) => { beams.qubit.on = t < 1 ? 1 : 0; bloch.setVector(stateFor(pulses, wait, i + 1, Math.max(0.001, t)).bloch(0)); bloch.pushTrail(); } });
      beams.qubit.on = 0;
    }
    circuit.setCircuit(columns(pulses.length));
    const fracBright = (shots - ones) / shots;
    beams.det.on = 1; lab.setIons([{ x: 0, glow: fracBright, label: '40Ca+' }]); lab.setCamera(true, fracBright);
    await ctx.animate({ duration: 550, ease: (t) => t, onFrame: () => { if (Math.random() < 0.6 * fracBright) lab.emit(0, 1); } });
    beams.det.on = 0.3; lab.setIons([{ x: 0, glow: 0.6, label: '40Ca+' }]); lab.setCamera(true, 0.6);
    const rec = { index: runs.length + 1, pulses: pulses.map((p) => p.phase), wait, shots, ones, p1 };
    runs.push(rec);
    roResult.set(shots === 1 ? (ones ? 'DARK → |1⟩' : 'BRIGHT → |0⟩') : `${ones} dark of ${shots} → P(dark) ≈ ${fmt.pct(ones / shots, 0)}`);
    ctx.announce(roResult.el.textContent);
    store.log('run', { experiment: meta.id, pulses: rec.pulses.length, wait, shots, ones });
    busy = false; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = false;
    phaseScan = waitScan = null;
    update();
    ctx.mission?.event('run', rec);
  }

  async function scanPhase() {
    if (busy) return;
    if (pulses.length < 2) { ctx.notify('Add a second π/2 pulse first'); return; }
    busy = true; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = true;
    const pts = []; const per = 50;
    for (let i = 0; i <= 24; i++) {
      const ph = -Math.PI + (i / 24) * 2 * Math.PI;
      const seq = [{ phase: 0 }, { phase: ph }];
      const p1 = stateFor(seq, wait).prob1(0);
      let ones = 0; for (let k = 0; k < per; k++) if (rng.chance(p1)) ones++;
      pts.push([(ph * 180) / Math.PI, ones / per]);
      phaseScan = { wait, points: pts }; waitScan = null; drawPlot();
      beams.qubit.on = 0.7; await ctx.animate({ duration: 50, onFrame: () => {} }); beams.qubit.on = 0;
    }
    store.log('scan', { experiment: meta.id, kind: 'phase', wait });
    busy = false; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = false;
    ctx.mission?.event('scan', { kind: 'phase', wait });
  }

  async function scanWait() {
    if (busy) return;
    busy = true; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = true;
    const pts = []; const per = 50;
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) * 300e-6;
      const p1 = stateFor([{ phase: 0 }, { phase: 0 }], t).prob1(0);
      let ones = 0; for (let k = 0; k < per; k++) if (rng.chance(p1)) ones++;
      pts.push([t * 1e6, ones / per]);
      waitScan = { points: pts }; phaseScan = null; drawPlot();
      beams.qubit.on = 0.7; await ctx.animate({ duration: 40, onFrame: () => {} }); beams.qubit.on = 0;
    }
    store.log('scan', { experiment: meta.id, kind: 'wait' });
    busy = false; runBtn.disabled = scanPhaseBtn.disabled = scanWaitBtn.disabled = false;
    ctx.mission?.event('scan', { kind: 'wait' });
  }

  const twoZero = (r) => r.pulses.length === 2 && Math.abs(r.pulses[1]) < 0.01 && r.wait === 0 && r.shots >= 100;
  const steps = [
    {
      id: 'one-half', kind: 'task', title: 'The coin flip',
      text: `The circuit has one <b>π/2 pulse</b>${usingOwn ? ', the half flip you calibrated' : ''}. Run it with <b>100 shots</b>.`,
      check: () => runs.some((r) => r.pulses.length === 1 && r.shots >= 100),
      doneText: 'About 50/50. Looks like a coin flip.',
      doneDetail: 'The ion comes out bright or dark at random, half the time each. So far a coin does the same.',
    },
    {
      id: 'predict-two', kind: 'predict', title: 'Flip the coin twice',
      text: 'Add a <b>second π/2 pulse</b> straight after the first (no wait, phase 0). A coin flipped twice is still 50/50. What will the ion do?',
      options: ['50 % dark, like two coin flips', 'Always dark (100 %)', 'Always bright (0 %)'],
      on: 'run', afterLock: 'Add the pulse and run 100 shots.',
      resolve: (guess, _c, r) => (twoZero(r) ? { correct: guess === 1, text: `${r.ones} of ${r.shots} dark. The two half flips do not average out, they <b>add up</b> to a full flip. A coin flip has probabilities that add; a qubit has <b>amplitudes</b> that add, and they can add up or cancel. This is <b>interference</b>.` } : null),
      why: 'On the Bloch sphere each π/2 pulse is a quarter turn about the same axis. Two quarter turns are a half turn: from |0⟩ straight to |1⟩. The randomness of the single pulse was never a coin inside the ion.',
    },
    {
      id: 'predict-phase', kind: 'predict', title: 'Turn the second pulse around',
      text: 'Set the <b>phase of the second pulse to 180°</b>. Now what?',
      options: ['Still always dark', 'Always bright: back to |0⟩', '50/50 again'],
      on: 'run', afterLock: 'Set the phase and run 100 shots.',
      resolve: (guess, _c, r) => (r.pulses.length === 2 && Math.abs(Math.abs(r.pulses[1]) - Math.PI) < 0.1 && r.wait === 0 && r.shots >= 100 ? { correct: guess === 1, text: `${r.ones} of ${r.shots} dark: the second pulse <b>undoes</b> the first. Turning the laser phase by 180° turns the rotation the other way, so the two paths that lead to |1⟩ now cancel. Same two pulses, opposite result: only the phase changed.` } : null),
    },
    {
      id: 'fringe', kind: 'task', title: 'Every phase in between',
      text: 'Press <b>Scan phase</b> to measure P(dark) for phases from −180° to 180°.',
      check: () => !!phaseScan && phaseScan.wait === 0,
      doneText: 'A fringe.',
      doneDetail: 'Smoothly from always-dark to always-bright and back: the two amplitudes add with a phase between them, like waves. This curve is called an interference fringe.',
    },
    {
      id: 'ramsey', kind: 'task', title: 'Add a wait: the Ramsey experiment',
      text: 'Set the <b>wait</b> between the two pulses to at least <b>100 µs</b>, then <b>Scan phase</b> again. Then press <b>Scan wait time</b>.',
      check: () => ({ done: !!waitScan || (!!phaseScan && phaseScan.wait >= 100e-6) && runs.length > 0 && !!waitScan, hint: phaseScan && phaseScan.wait >= 100e-6 ? 'Now press Scan wait time.' : 'Set the wait to 100 µs or more and scan the phase.' }),
      doneText: 'The fringe moves with time.',
      doneDetail: () => `During the wait the qubit’s phase advances at the difference between its own frequency and the laser’s: about ${fmt.khz(Math.abs(delta), 1)} here. Ramsey fringes are how atomic clocks measure frequency, and how this machine finds its qubit frequency.`,
    },
    {
      id: 'wrap', kind: 'info', title: 'Amplitudes, not probabilities',
      text: 'A quantum computer is not a machine that tries many answers at random. It arranges amplitudes so the wrong answers cancel and the right ones add up, exactly what the second π/2 pulse did here. Experiment 7 shows what noise does to this, and experiment 8 uses it to solve puzzles.',
      button: 'Finish mission',
    },
  ];

  syncControls();
  update();
  return {
    steps,
    frame(dt) { lab.tick(dt); lab.draw(); bloch.draw(); },
    dispose() { lab.dispose(); bloch.dispose(); plot.dispose(); },
  };
}
