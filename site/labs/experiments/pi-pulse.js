// Experiment 4 — Find the π-Pulse.
// The student drives the qubit with the 729 nm laser, discovers the Rabi
// oscillation and calibrates their own X gate (and π/2 gate), which the
// later experiments reuse.

import { el, slider, button, segmented, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { BlochSphere } from '../framework/views/bloch.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel, matrixHtml, ketHtml } from '../framework/views/math-panel.js';
import { QState } from '../core/qstate.js';
import { pulseUnitary, excitedPopulation, pulseAngle, effectiveRabi } from '../core/pulses.js';
import { COLORS } from '../framework/views/canvas.js';

export const meta = {
  id: 'pi-pulse', number: 4, title: 'Find the π-Pulse',
  concept: 'Rabi oscillation, gate calibration',
  mission: 'Calibrate an X gate to 98 % fidelity',
};

const MAX_US = 20;

export function create(ctx) {
  const { rng, store } = ctx;
  const rabi = ctx.machine.rabi;             // the machine's true Rabi frequency (hidden)
  const truePi = Math.PI / rabi;
  let duration = 3e-6;
  let detuning = 0;
  let shots = 1;
  let busy = false;
  let curveRevealed = store.progress(meta.id).completed;
  let detuningUnlocked = curveRevealed;
  const runs = [];       // { duration, detuning, shots, ones, p1 }
  let scan = null;       // { detuning, points: [[us, frac]] }
  let best = null;       // best π-pulse run

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const beams = { qubit: { id: '729', on: 0, label: '729 nm qubit laser' }, det: { id: '397', on: 0.35, label: '397 nm detection', angle: Math.PI / 5 } };
  lab.setBeams([beams.det, beams.qubit]);
  lab.setIons([{ x: 0, glow: 0.6, label: '40Ca+' }]);
  lab.setCamera(true, 0.6);

  const circuit = new CircuitView(ctx.card('Circuit', { help: 'the same pulse, as a gate' }), { qubits: 1, labels: ['|0⟩'] });
  const plot = new Plot(ctx.card('Dark probability vs pulse length'), { label: 'Plot of P(1) against pulse duration' });
  const roCard = ctx.card('Numbers', { depth: 'understand' });
  const roTheta = readout('Rotation angle θ = Ωt'); const roP1 = readout('Predicted P(1)'); const roRabi = readout('Ω found so far', '—');
  roCard.append(roTheta.el, roP1.el, roRabi.el);
  const bloch = new BlochSphere(ctx.card('Bloch sphere', { depth: 'understand', help: 'the qubit as an arrow' }));
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  // ---- controls ----
  const durSlider = slider({ id: 'dur', label: 'Pulse duration', min: 0, max: MAX_US, step: 0.05, value: 3, format: (v) => `${Number(v).toFixed(2)} µs`, onInput: (v) => { duration = v * 1e-6; update(); } });
  const detSlider = slider({ id: 'det', label: 'Laser detuning', min: -200, max: 200, step: 5, value: 0, format: (v) => `${v > 0 ? '+' : ''}${v} kHz`, onInput: (v) => { detuning = 2 * Math.PI * v * 1e3; update(); } });
  detSlider.el.hidden = true;
  const shotsSeg = segmented({ id: 'shots', label: 'Shots per run', options: [{ value: 1, label: '1 shot' }, { value: 10, label: '10 shots' }, { value: 100, label: '100 shots' }], value: 1, onChange: (v) => { shots = Number(v); } });
  const fireBtn = button('Fire pulse', run, { primary: true });
  const scanBtn = button(`Scan 0–${MAX_US} µs`, doScan, { title: '25 durations × 100 shots' });
  const roResult = readout('Last result', '—');
  ctx.controls.append(
    el('div', { class: 'controls-grid' }, durSlider.el, detSlider.el),
    el('div', { class: 'controls-row' }, fireBtn, shotsSeg.el, scanBtn),
    roResult.el,
  );

  // ---- physics ----
  const pulse = () => ({ duration, detuning, rabi });
  const stateAfter = (frac = 1) => new QState(1).apply(pulseUnitary({ duration: duration * frac, detuning, rabi }), [0]);
  const axisOf = () => { const w = effectiveRabi(rabi, detuning); return w ? [rabi / w, 0, detuning / w] : [1, 0, 0]; };

  function update() {
    const s = stateAfter();
    const p1 = s.prob1(0);
    const theta = pulseAngle(pulse());
    if (!busy) { bloch.setVector(s.bloch(0)); bloch.setAxis(axisOf()); bloch.clearTrail(); }
    circuit.setCircuit([
      [{ q: 0, label: `R(${fmt.pi(theta)})`, sub: fmt.us(duration, 2), kind: 'pulse' }],
      [{ q: 0, kind: 'measure' }],
    ]);
    roTheta.set(`${fmt.pi(theta)} = ${fmt.deg(theta)}`);
    roP1.set(fmt.pct(p1, 1));
    if (best) roRabi.set(fmt.khz(Math.PI / best.duration, 1));
    drawPlot();
    const U = pulseUnitary(pulse());
    math.set([
      { title: 'Rabi formula', html: `<span class="eq">P(1) = (Ω/Ω′)² · sin²(Ω′t / 2),  Ω′ = √(Ω² + Δ²)</span><span class="eq">t = ${fmt.us(duration, 2)}, Δ = ${fmt.khz(detuning, 0)} ${best ? `, Ω ≈ 2π × ${fmt.khz(Math.PI / best.duration, 1)}` : ''}</span>` },
      { title: 'Pulse unitary U = exp(−i θ n·σ / 2)', html: matrixHtml(U) },
      { title: 'State after the pulse', html: `${ketHtml(s)}<div class="note">Bloch vector (${s.bloch(0).map((v) => v.toFixed(2)).join(', ')})</div>` },
    ]);
    lab.setCaption(`Pulse ${fmt.us(duration, 2)}${detuning ? `, detuning ${fmt.khz(detuning, 0)}` : ''}. ${busy ? '' : 'Ion ready in |0⟩ (bright).'}`);
    ctx.mission?.poll();
  }

  function drawPlot() {
    const series = [];
    if (curveRevealed || ctx.mission?.completed) {
      const pts = [];
      for (let i = 0; i <= 200; i++) { const t = (i / 200) * MAX_US * 1e-6; pts.push([t * 1e6, excitedPopulation({ duration: t, detuning, rabi })]); }
      series.push({ name: detuning ? 'model (with detuning)' : 'model', points: pts, color: COLORS.muted, width: 1.5, dash: [4, 3] });
    }
    if (scan) series.push({ name: `scan${scan.detuning ? ` @ ${fmt.khz(scan.detuning, 0)}` : ''}`, kind: 'scatter', points: scan.points, color: COLORS.accent, radius: 3 });
    const mine = runs.filter((r) => r.detuning === detuning).map((r) => [r.duration * 1e6, r.ones / r.shots, r.shots > 1 ? Math.sqrt((r.ones / r.shots) * (1 - r.ones / r.shots) / r.shots) : 0]);
    if (mine.length) series.push({ name: 'your runs', kind: 'scatter', points: mine, color: COLORS.accent2, radius: 4 });
    plot.setData({ series, xLabel: 'pulse duration (µs)', yLabel: 'P(dark) = P(1)', xRange: [0, MAX_US], yRange: [0, 1.05], vlines: [{ x: duration * 1e6, label: '', color: 'rgba(244,114,182,0.5)' }], hlines: best ? [{ y: 0.98, label: '98 %', color: COLORS.success }] : [] });
  }

  async function run() {
    if (busy) return;
    busy = true; fireBtn.disabled = true; scanBtn.disabled = true;
    const p1 = stateAfter().prob1(0);
    let ones = 0;
    for (let i = 0; i < shots; i++) if (rng.chance(p1)) ones++;
    // 1. the pulse: 729 nm on, Bloch vector rotates
    beams.det.on = 0; lab.setIons([{ x: 0, glow: 0, label: '40Ca+' }]); lab.setCamera(true, 0);
    bloch.clearTrail(); bloch.setAxis(axisOf());
    circuit.setCircuit([[{ q: 0, label: `R(${fmt.pi(pulseAngle(pulse()))})`, sub: fmt.us(duration, 2), kind: 'pulse', active: true }], [{ q: 0, kind: 'measure' }]]);
    const ms = Math.max(350, 60 * duration * 1e6);
    await ctx.animate({ duration: ms, ease: (t) => t, onFrame: (t) => { beams.qubit.on = t < 1 ? 1 : 0; bloch.setVector(stateAfter(t).bloch(0)); bloch.pushTrail(); } });
    beams.qubit.on = 0;
    // 2. detection: 397 nm on, the ion is bright or dark
    circuit.setCircuit([[{ q: 0, label: `R(${fmt.pi(pulseAngle(pulse()))})`, sub: fmt.us(duration, 2), kind: 'pulse' }], [{ q: 0, kind: 'measure', active: true }]]);
    const fracBright = (shots - ones) / shots;
    beams.det.on = 1;
    lab.setIons([{ x: 0, glow: fracBright, label: '40Ca+' }]); lab.setCamera(true, fracBright);
    await ctx.animate({ duration: 600, ease: (t) => t, onFrame: (t, raw) => { if (fracBright > 0 && Math.random() < 0.6 * fracBright) lab.emit(0, 1); } });
    const rec = { duration, detuning, shots, ones, p1, ts: Date.now() };
    runs.push(rec);
    if (shots === 1) roResult.set(ones ? 'DARK  →  |1⟩' : 'BRIGHT  →  |0⟩');
    else roResult.set(`${ones} dark of ${shots}  →  P(1) ≈ ${fmt.pct(ones / shots, 0)}`);
    roResult.setClass(shots === 1 ? (ones ? 'is-bad' : 'is-good') : '');
    ctx.announce(shots === 1 ? (ones ? 'The ion is dark: state 1' : 'The ion is bright: state 0') : `${ones} of ${shots} shots dark`);
    store.log('run', { experiment: meta.id, duration, detuning, shots, ones });
    if (detuning === 0 && shots >= 100 && (!best || p1 > best.p1)) best = rec;
    // 3. back to ready
    beams.det.on = 0.35; lab.setIons([{ x: 0, glow: 0.6, label: '40Ca+' }]); lab.setCamera(true, 0.6);
    busy = false; fireBtn.disabled = false; refreshButtons();
    update();
    ctx.mission?.event('run', rec);
  }

  async function doScan() {
    if (busy) return;
    busy = true; fireBtn.disabled = true; scanBtn.disabled = true;
    const n = 25, per = 100;
    const points = [];
    beams.det.on = 0.6;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * MAX_US * 1e-6;
      const p1 = excitedPopulation({ duration: t, detuning, rabi });
      let ones = 0;
      for (let k = 0; k < per; k++) if (rng.chance(p1)) ones++;
      points.push([t * 1e6, ones / per]);
      scan = { detuning, points };
      beams.qubit.on = 0.6;
      drawPlot();
      await ctx.animate({ duration: 70, onFrame: () => {} });
      beams.qubit.on = 0;
    }
    beams.det.on = 0.35;
    store.log('scan', { experiment: meta.id, detuning });
    busy = false; fireBtn.disabled = false; refreshButtons();
    update();
    ctx.mission?.event('scan', { detuning, points });
  }

  function refreshButtons() {
    const m = ctx.mission;
    const allowScan = !m || m.completed || m.index >= 2 || (m.index === 1 && m.locked);
    scanBtn.disabled = busy || !allowScan;
    detSlider.el.hidden = !detuningUnlocked;
  }

  function saveCalibration(patch) {
    store.setCalibration({ rabi, ...patch });
    ctx.notify('Saved to your machine profile');
  }

  // ---- mission ----
  const steps = [
    {
      id: 'fire', kind: 'task', title: 'Meet your qubit',
      text: 'This is a single calcium ion held in the trap. It is in state |0⟩ and glows because the violet 397 nm laser makes |0⟩ scatter light. The red 729 nm laser can flip it to |1⟩, which is dark. <b>Fire one pulse</b> and watch what happens.',
      check: () => runs.length >= 1,
      doneText: 'One shot, one answer.',
      doneDetail: 'The camera saw the ion either bright or dark. There is no “partly flipped” reading, even though the pulse may only have flipped it part of the way. Fire a few more single shots at the same setting if you like.',
      why: 'Measurement forces the qubit to pick |0⟩ or |1⟩. The pulse changes the <i>probability</i> of each answer, which you can only see by repeating the experiment.',
    },
    {
      id: 'predict-longer', kind: 'predict', title: 'Longer pulses',
      text: `Now imagine making the pulse longer and longer, from 0 to ${MAX_US} µs. What will the chance of finding the ion dark do?`,
      options: ['Keep rising towards 100 %', 'Rise, then fall, then rise again', 'Stay about the same'],
      on: 'scan', afterLock: 'Press <b>Scan</b> to measure it at 25 durations, 100 shots each.',
      resolve: (guess) => ({ correct: guess === 1, text: 'The dark probability <b>oscillates</b>. The laser drives the ion round and round between |0⟩ and |1⟩; it does not just push it to |1⟩ and stop. This is a <b>Rabi oscillation</b>. The pulse length that reaches the first peak is called the <b>π pulse</b>.' }),
      onDone: () => { curveRevealed = true; update(); },
      why: 'The laser rotates the qubit’s state at a steady rate, the Rabi frequency Ω. After a half turn (θ = π) the ion is in |1⟩; after a full turn it is back in |0⟩.',
    },
    {
      id: 'find-pi', kind: 'task', title: 'Find the π pulse',
      text: 'Set the duration to the first peak and check it with <b>100 shots</b>. Score: the true flip probability at your setting must be at least <b>98 %</b>. Steps of 0.05 µs matter here.',
      check: () => {
        const ok = runs.find((r) => r.detuning === 0 && r.shots >= 100 && r.p1 >= 0.98);
        const bestP = runs.filter((r) => r.detuning === 0 && r.shots >= 100).reduce((m, r) => Math.max(m, r.p1), 0);
        return { done: !!ok, progress: bestP, hint: bestP ? `Best so far: ${fmt.pct(bestP, 1)}. ${bestP < 0.9 ? 'Look at where the scan peaks.' : 'Close: nudge the duration by 0.05 µs and re-run 100 shots.'}` : 'Run 100 shots at your best guess.' };
      },
      doneText: 'That is your X gate.',
      doneDetail: () => { const b = runs.filter((r) => r.detuning === 0 && r.shots >= 100).reduce((m, r) => (r.p1 > (m?.p1 ?? 0) ? r : m), null); return `π pulse = <b>${fmt.us(b.duration, 2)}</b>, flip fidelity <b>${fmt.pct(b.p1, 1)}</b>. Saved to your machine profile; the next experiments will use it.`; },
      onDone: () => { const b = runs.filter((r) => r.detuning === 0 && r.shots >= 100).reduce((m, r) => (r.p1 > (m?.p1 ?? 0) ? r : m), null); best = b; saveCalibration({ tPi: b.duration, tHalf: b.duration / 2, fidelity: b.p1 }); update(); },
    },
    {
      id: 'name-it', kind: 'info', title: 'You just calibrated a gate',
      text: 'On a circuit diagram, a π pulse is the <b>X gate</b>: it flips |0⟩ ↔ |1⟩ like a classical NOT. Real machines redo this calibration many times a day, because the Rabi frequency drifts with laser power and beam alignment.',
      why: 'The rotation angle is θ = Ω·t. Only the product matters, so a stronger laser needs a shorter pulse. Your π-pulse time tells you the machine’s Ω = π / t<sub>π</sub>.',
    },
    {
      id: 'find-half', kind: 'task', title: 'Find the half flip',
      text: 'Now find the pulse that leaves the ion dark <b>exactly half the time</b> (the first place the curve crosses 50 %). This <b>π/2 pulse</b> is your “coin flip” gate for the next experiment. Check it with 100 shots.',
      check: () => {
        const ok = runs.find((r) => r.detuning === 0 && r.shots >= 100 && Math.abs(r.p1 - 0.5) <= 0.03 && r.duration < truePi);
        const near = runs.filter((r) => r.detuning === 0 && r.shots >= 100 && r.duration < truePi).reduce((m, r) => Math.min(m, Math.abs(r.p1 - 0.5)), 1);
        return { done: !!ok, progress: Math.max(0, 1 - near * 2), hint: near < 1 ? `Closest so far: ${fmt.pct(0.5 - near, 0)} to ${fmt.pct(0.5 + near, 0)} band. Aim for half your π-pulse time.` : 'Try half of your π-pulse time.' };
      },
      doneText: 'Half a flip: a superposition.',
      doneDetail: () => `π/2 pulse = <b>${fmt.us(runs.filter((r) => r.detuning === 0 && r.shots >= 100 && r.duration < truePi).reduce((m, r) => (Math.abs(r.p1 - 0.5) < Math.abs((m?.p1 ?? 0) - 0.5) ? r : m), null).duration, 2)}</b>. After it the ion is not “half dark”: it is in a superposition, and each shot still gives one answer.`,
      onDone: () => { const h = runs.filter((r) => r.detuning === 0 && r.shots >= 100 && r.duration < truePi).reduce((m, r) => (Math.abs(r.p1 - 0.5) < Math.abs((m?.p1 ?? 0) - 0.5) ? r : m), null); saveCalibration({ tHalf: h.duration }); },
    },
    {
      id: 'predict-detuning', kind: 'predict', title: 'Stretch: off-resonance',
      text: 'The detuning knob shifts the laser frequency away from the ion’s. Set it to <b>+100 kHz</b> or more. Compared with resonance, the oscillation will be…',
      options: ['Slower and just as deep', 'Faster but shallower', 'Unchanged'],
      on: 'scan', afterLock: 'Set the detuning, then press <b>Scan</b>.',
      onEnter: () => { detuningUnlocked = true; refreshButtons(); },
      resolve: (guess, _c, data) => (data && Math.abs(data.detuning) >= 2 * Math.PI * 50e3 ? { correct: guess === 1, text: 'Off resonance the oscillation is <b>faster</b> (the effective frequency is √(Ω² + Δ²)) but <b>never reaches 100 %</b>: the rotation axis tilts out of the equator, so the arrow misses the |1⟩ pole. This is how experimenters find the qubit frequency: they look for the detuning that makes the oscillation deepest.' } : null),
    },
    {
      id: 'wrap', kind: 'info', title: 'What you now own',
      text: 'A calibrated X gate and a π/2 gate, both saved in your lab notebook. Every later experiment runs on <i>your</i> calibration, so sloppiness here shows up later as lower success rates. You can come back and recalibrate any time.',
      button: 'Finish mission',
    },
  ];

  // Restore state for a completed mission (free play): show the model curve and unlock everything.
  const cal = store.calibration;
  if (cal && cal.tPi) best = { duration: cal.tPi, p1: cal.fidelity ?? 1 };

  update();

  return {
    steps,
    ready() { ctx.mission.onChange(refreshButtons); refreshButtons(); },
    frame(dt) { lab.tick(dt); lab.draw(); bloch.draw(); },
    dispose() { lab.dispose(); bloch.dispose(); plot.dispose(); },
  };
}
