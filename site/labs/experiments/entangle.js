// Experiment 6 — Entangle Two Ions.
// Two ions share a vibration mode (the "quantum bus"). A Mølmer–Sørensen
// gate driven through that mode entangles them: at the right duration only
// 00 and 11 appear. Bonus: the CHSH game against a classical cheater.

import { el, slider, button, segmented, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { BlochSphere } from '../framework/views/bloch.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel, matrixHtml, ketHtml } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import { QState, bellFidelity } from '../core/qstate.js';
import { MS, RY, S } from '../core/gates.js';

export const meta = {
  id: 'entangle', number: 6, title: 'Entangle Two Ions',
  concept: 'Shared motion, entangling gate, Bell states',
  mission: 'Make a Bell pair with 90 % fidelity',
};

const T_MAX = 80e-6;

export function create(ctx) {
  const { rng, store } = ctx;
  const msRate = ctx.machine.msRate;             // θ = msRate · t (hidden)
  let duration = 10e-6;
  let phase = 0;
  let shots = 100;
  let busy = false;
  const runs = [];
  let scan = null;
  let game = { rounds: 0, quantumWins: 0, classicalWins: 0 };
  let t = 0;

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const beams = { ms1: { id: '729', on: 0, label: '729 nm bichromatic beam', target: 0 }, ms2: { id: '729', on: 0, target: 1 }, det: { id: '397', on: 0.3, label: '397 nm detection', angle: Math.PI / 5, target: 0 }, det2: { id: '397', on: 0.3, angle: Math.PI / 5, target: 1 } };
  lab.setBeams([beams.det, beams.det2, beams.ms1, beams.ms2]);
  const ions = [{ x: -0.35, glow: 0.6, label: 'ion A', dx: 0 }, { x: 0.35, glow: 0.6, label: 'ion B', dx: 0 }];
  lab.setIons(ions); lab.setCamera(true, 0.6);
  let rock = 0.25; // amplitude of the shared motion animation

  const circuit = new CircuitView(ctx.card('Circuit'), { qubits: 2, labels: ['|0⟩', '|0⟩'] });
  const gridCard = ctx.card('Joint outcomes', { help: 'both ions measured together' });
  const cells = {};
  const grid = el('div', { class: 'hist-grid' }, ...['00', '01', '10', '11'].map((k) => { const b = el('b', { text: '0' }); const bar = el('i'); cells[k] = { b, bar }; return el('div', { class: 'hist-cell' }, `|${k}⟩`, b, el('div', { class: 'bar' }, bar)); }));
  gridCard.append(grid);
  const plot = new Plot(ctx.card('Outcomes vs gate duration'), { label: 'Populations against gate duration' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roTheta = readout('Gate angle θ'); const roF = readout('Bell-state fidelity'); const roCorr = readout('Same-result correlation');
  nums.append(roTheta.el, roF.el, roCorr.el);
  const blochCard = ctx.card('Each ion on its own', { depth: 'understand', help: 'arrows shrink when entangled' });
  const blochWrap = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } });
  blochCard.append(blochWrap);
  const b1 = new BlochSphere(el('div', {}, )); const b2 = new BlochSphere(el('div'));
  blochWrap.append(b1.parent, b2.parent);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));
  const gameCard = ctx.card('Bell game (CHSH)', { help: 'quantum vs a classical cheater' });
  const gameBars = el('div', { class: 'hist-grid' });
  const gameBtn = button('Play 200 rounds', playGame, { primary: true });
  gameCard.append(el('p', { class: 'muted', style: { fontSize: '13px' }, text: 'Each round a referee gives A and B one random bit each. They win if their answers differ exactly when both bits are 1. No classical strategy wins more than 75 %.' }), gameBars, el('div', { class: 'controls-row' }, gameBtn));

  // ---- controls ----
  const durSlider = slider({ id: 'msdur', label: 'Entangling gate duration', min: 0, max: T_MAX * 1e6, step: 0.5, value: 10, format: (v) => `${Number(v).toFixed(1)} µs`, onInput: (v) => { duration = v * 1e-6; update(); } });
  const phaseSlider = slider({ id: 'msphase', label: 'Laser phase', min: 0, max: 360, step: 5, value: 0, format: (v) => `${v}°`, onInput: (v) => { phase = (v * Math.PI) / 180; update(); } });
  const shotsSeg = segmented({ id: 'shots', label: 'Shots', options: [{ value: 1, label: '1 shot' }, { value: 100, label: '100 shots' }], value: 100, onChange: (v) => { shots = Number(v); } });
  const runBtn = button('Run gate', run, { primary: true });
  const scanBtn = button('Scan duration', doScan);
  const roResult = readout('Last result', '—');
  ctx.controls.append(el('div', { class: 'controls-grid' }, durSlider.el, phaseSlider.el), el('div', { class: 'controls-row' }, runBtn, shotsSeg.el, scanBtn), roResult.el);

  // ---- physics ----
  const theta = () => msRate * duration;
  const stateFor = (th = theta(), ph = phase) => new QState(2).apply(MS(th, ph), [0, 1]);

  function update() {
    const s = stateFor();
    const p = s.probabilities();
    const F = bellFidelity(s);
    roTheta.set(`${fmt.pi(theta())} (${fmt.deg(theta())})`);
    roF.set(fmt.pct(F, 1)); roF.setClass(F >= 0.9 ? 'is-good' : '');
    roCorr.set(fmt.pct(p[0] + p[3], 0));
    if (!busy) { b1.setVector(s.bloch(0)); b2.setVector(s.bloch(1)); }
    circuit.setCircuit([[{ q: [0, 1], label: `MS(${fmt.pi(theta())})`, sub: fmt.us(duration, 1), kind: 'ms' }], [{ q: 0, kind: 'measure' }, { q: 1, kind: 'measure' }]]);
    drawPlot();
    math.set([
      { title: 'Mølmer–Sørensen gate', html: `<span class="eq">U = exp(−i θ/2 · σ<sub>φ</sub>⊗σ<sub>φ</sub>),  θ = Ω<sub>MS</sub> t</span><span class="eq">|00⟩ → cos(θ/2)|00⟩ − i sin(θ/2)|11⟩</span><span class="eq">θ = π/2 gives the Bell state (|00⟩ − i|11⟩)/√2; fidelity F = (1 + sin θ)/2</span>` },
      { title: 'State now', html: ketHtml(s) + `<div class="note">Both ions are driven together through a shared vibration mode; the mode ends where it started, so only the spins keep the entanglement. Reduced Bloch vectors: A (${s.bloch(0).map((v) => v.toFixed(2)).join(', ')}), B (${s.bloch(1).map((v) => v.toFixed(2)).join(', ')}).</div>` },
      { title: 'Unitary', html: matrixHtml(MS(theta(), phase)) },
    ]);
    lab.setCaption(`MS gate ${fmt.us(duration, 1)}, θ = ${fmt.pi(theta())}. Ions ready in |00⟩.`);
    ctx.mission?.poll();
  }

  function showCounts(counts, total) {
    ['00', '01', '10', '11'].forEach((k, i) => { cells[k].b.textContent = counts[i]; cells[k].bar.style.width = `${total ? (counts[i] / total) * 100 : 0}%`; });
  }

  function drawPlot() {
    const series = [];
    if (scan) {
      series.push({ name: 'P(00)', kind: 'scatter', points: scan.p00, color: COLORS.accent });
      series.push({ name: 'P(11)', kind: 'scatter', points: scan.p11, color: COLORS.accent2 });
      series.push({ name: 'P(01)+P(10)', kind: 'scatter', points: scan.pmix, color: COLORS.warn });
    }
    if (ctx.depth !== 'explore') {
      const m = (idx) => Array.from({ length: 81 }, (_, i) => { const tt = (i / 80) * T_MAX; const pr = stateFor(msRate * tt).probabilities(); return [tt * 1e6, idx === 0 ? pr[0] : idx === 3 ? pr[3] : pr[1] + pr[2]]; });
      series.push({ points: m(0), color: 'rgba(56,189,248,0.5)', width: 1, dash: [4, 3] }, { points: m(3), color: 'rgba(244,114,182,0.5)', width: 1, dash: [4, 3] });
    }
    plot.setData({ series, xLabel: 'gate duration (µs)', yLabel: 'probability', xRange: [0, T_MAX * 1e6], yRange: [0, 1.05], vlines: [{ x: duration * 1e6, label: '', color: 'rgba(244,114,182,0.5)' }] });
  }

  async function run() {
    if (busy) return;
    busy = true; runBtn.disabled = scanBtn.disabled = true;
    const s = stateFor();
    const counts = s.sample(shots, rng);
    beams.det.on = beams.det2.on = 0; ions.forEach((i) => { i.glow = 0; }); lab.setCamera(true, 0);
    circuit.setCircuit([[{ q: [0, 1], label: `MS(${fmt.pi(theta())})`, sub: fmt.us(duration, 1), kind: 'ms', active: true }], [{ q: 0, kind: 'measure' }, { q: 1, kind: 'measure' }]]);
    const ms = Math.max(500, duration * 1e6 * 25);
    await ctx.animate({ duration: ms, ease: (x) => x, onFrame: (x) => { beams.ms1.on = beams.ms2.on = x < 1 ? 1 : 0; rock = 0.25 + 0.5 * Math.sin(Math.PI * x); const st = stateFor(theta() * x); b1.setVector(st.bloch(0)); b2.setVector(st.bloch(1)); } });
    beams.ms1.on = beams.ms2.on = 0; rock = 0.25;
    circuit.setCircuit([[{ q: [0, 1], label: `MS(${fmt.pi(theta())})`, sub: fmt.us(duration, 1), kind: 'ms' }], [{ q: 0, kind: 'measure', active: true }, { q: 1, kind: 'measure', active: true }]]);
    const total = shots;
    const brightA = (counts[0] + counts[1]) / total, brightB = (counts[0] + counts[2]) / total;
    beams.det.on = beams.det2.on = 1; ions[0].glow = brightA; ions[1].glow = brightB; lab.setCamera(true, (brightA + brightB) / 2);
    await ctx.animate({ duration: 600, ease: (x) => x, onFrame: () => { if (Math.random() < 0.5 * brightA) lab.emit(0, 1); if (Math.random() < 0.5 * brightB) lab.emit(1, 1); } });
    beams.det.on = beams.det2.on = 0.3; ions.forEach((i) => { i.glow = 0.6; }); lab.setCamera(true, 0.6);
    showCounts(counts, total);
    const F = bellFidelity(s);
    const rec = { duration, phase, shots, counts: Array.from(counts), fidelity: F, theta: theta() };
    runs.push(rec);
    roResult.set(shots === 1 ? `|${['00', '01', '10', '11'][counts.indexOf(1)]}⟩` : `00: ${counts[0]}  01: ${counts[1]}  10: ${counts[2]}  11: ${counts[3]}`);
    ctx.announce(roResult.el.textContent);
    store.log('run', { experiment: meta.id, duration, shots, counts: rec.counts });
    busy = false; runBtn.disabled = scanBtn.disabled = false;
    update();
    ctx.mission?.event('run', rec);
  }

  async function doScan() {
    if (busy) return;
    busy = true; runBtn.disabled = scanBtn.disabled = true;
    const p00 = [], p11 = [], pmix = [];
    for (let i = 0; i <= 32; i++) {
      const tt = (i / 32) * T_MAX;
      const c = stateFor(msRate * tt).sample(60, rng);
      p00.push([tt * 1e6, c[0] / 60]); p11.push([tt * 1e6, c[3] / 60]); pmix.push([tt * 1e6, (c[1] + c[2]) / 60]);
      scan = { p00, p11, pmix }; drawPlot();
      beams.ms1.on = beams.ms2.on = 0.7; await ctx.animate({ duration: 50, onFrame: () => {} }); beams.ms1.on = beams.ms2.on = 0;
    }
    store.log('scan', { experiment: meta.id });
    busy = false; runBtn.disabled = scanBtn.disabled = false;
    update();
    ctx.mission?.event('scan', scan);
  }

  /** CHSH: measure the (phase-corrected) MS state along angles a ∈ {0, π/2}, b ∈ {π/4, −π/4}. */
  function playGame() {
    const n = 200;
    let q = 0, c = 0;
    for (let i = 0; i < n; i++) {
      const x = rng.int(2), y = rng.int(2);
      // quantum strategy on the student's actual state
      const s = stateFor();
      s.apply(S(), [0]); // phase fix: (|00⟩ − i|11⟩)/√2 → (|00⟩ + |11⟩)/√2
      const a = x ? Math.PI / 2 : 0, b = y ? -Math.PI / 4 : Math.PI / 4;
      s.apply(RY(-a), [0]); s.apply(RY(-b), [1]);
      const out = s.sampleOne(rng);
      const ra = out >> 1, rb = out & 1;
      if ((ra ^ rb) === (x & y)) q++;
      // classical cheater: best deterministic strategy, always answer 0 and 0
      if ((0 ^ 0) === (x & y)) c++;
    }
    game = { rounds: game.rounds + n, quantumWins: game.quantumWins + q, classicalWins: game.classicalWins + c };
    const qr = game.quantumWins / game.rounds, cr = game.classicalWins / game.rounds;
    gameBars.replaceChildren(
      el('div', { class: 'hist-cell' }, 'quantum (your Bell pair)', el('b', { text: fmt.pct(qr, 1) }), el('div', { class: 'bar' }, el('i', { style: { width: `${qr * 100}%` } }))),
      el('div', { class: 'hist-cell' }, 'classical cheater', el('b', { text: fmt.pct(cr, 1) }), el('div', { class: 'bar' }, el('i', { style: { width: `${cr * 100}%`, background: COLORS.warn } }))),
    );
    store.log('chsh', { experiment: meta.id, rounds: game.rounds, quantum: qr, classical: cr });
    ctx.mission?.event('game', game);
    ctx.mission?.poll();
  }

  const steps = [
    {
      id: 'bus', kind: 'info', title: 'Two ions, one vibration',
      text: 'Two ions in the same trap repel each other, so they vibrate together like two balls on a spring. That shared motion is the <b>quantum bus</b>: a laser that pushes on the ions depending on their spin state can use it to make one ion’s state depend on the other’s.',
      why: 'The bichromatic 729 nm beam drives both ions slightly off resonance with the vibration. Over the gate time the motion makes a closed loop and returns to where it started, leaving behind a spin–spin interaction: the Mølmer–Sørensen gate.',
    },
    {
      id: 'first', kind: 'task', title: 'Try the gate',
      text: 'Run the entangling gate at <b>10 µs</b> with 100 shots and look at the joint outcomes.',
      check: () => runs.some((r) => r.shots >= 100),
      doneText: 'Mostly 00, some 11, and…',
      doneDetail: 'Look at 01 and 10. Whatever the duration, the ions come out the same. Their answers are correlated even though each one alone looks random.',
    },
    {
      id: 'predict-scan', kind: 'predict', title: 'Longer gates',
      text: 'Scan the gate duration from 0 to 80 µs. Which outcomes will appear?',
      options: ['All four, equally', 'Only 00 and 11, in a mix that changes with duration', 'Only 01 and 10'],
      on: 'scan', afterLock: 'Press Scan duration.',
      resolve: (guess) => ({ correct: guess === 1, text: 'Only 00 and 11, trading places as the duration grows. The gate rotates the pair between |00⟩ and |11⟩ the way a π pulse rotates one qubit between |0⟩ and |1⟩, never through 01 or 10. Halfway, the pair is in an equal superposition of 00 and 11: a <b>Bell state</b>.' }),
    },
    {
      id: 'bell', kind: 'task', title: 'Make a Bell pair',
      text: 'Set the duration where 00 and 11 are <b>50/50</b> and run 100 shots. The true Bell-state fidelity at your setting must be <b>at least 90 %</b>.',
      check: () => { const best = runs.filter((r) => r.shots >= 100).reduce((m, r) => Math.max(m, r.fidelity), 0); return { done: best >= 0.9, progress: best, hint: best ? `Best fidelity so far: ${fmt.pct(best, 1)}. Aim for equal 00 and 11 counts.` : null }; },
      doneText: 'A Bell pair.',
      doneDetail: () => { const b = runs.filter((r) => r.shots >= 100).reduce((m, r) => (r.fidelity > (m?.fidelity ?? 0) ? r : m), null); return `Gate ${fmt.us(b.duration, 1)}, fidelity ${fmt.pct(b.fidelity, 1)}. Saved as your entangling gate.`; },
      onDone: () => { const b = runs.filter((r) => r.shots >= 100).reduce((m, r) => (r.fidelity > (m?.fidelity ?? 0) ? r : m), null); store.setCalibration({ msTheta: b.theta, msDuration: b.duration, bellFidelity: b.fidelity }); ctx.notify('Entangling gate saved to your machine profile'); },
    },
    {
      id: 'meaning', kind: 'info', title: 'What entangled means',
      text: 'Measure ion A alone and it is a perfect coin: 50/50, no pattern (its Bloch arrow has shrunk to nothing). Same for B. But A and B always agree. The information is not in either ion; it is in the pair. That is what “entangled” means.',
      why: 'Neither ion has a state of its own any more. Only the joint state (|00⟩ − i|11⟩)/√2 is defined. This is not a hidden agreement made in advance, which the Bell game below can prove.',
    },
    {
      id: 'chsh', kind: 'task', title: 'Bonus: beat the cheater',
      text: 'In the Bell game a classical player, however clever, wins at most <b>75 %</b>. Play 200 rounds with your Bell pair and beat that.',
      check: () => { const qr = game.rounds ? game.quantumWins / game.rounds : 0; return { done: game.rounds >= 200 && qr > 0.78, hint: game.rounds ? `Quantum win rate ${fmt.pct(qr, 1)} (${game.rounds} rounds). ${qr <= 0.78 ? 'A better Bell pair wins more often.' : ''}` : null }; },
      doneText: 'More than any classical strategy can.',
      doneDetail: 'With a perfect Bell pair the quantum strategy wins 85 %. No pre-arranged answers can do that. This is Bell’s theorem as a game, and it has been won in real labs with trapped ions.',
    },
    {
      id: 'wrap', kind: 'info', title: 'Your two-qubit gate',
      text: 'Every quantum algorithm needs a gate like this. Experiment 8 compiles CNOT gates out of your entangling gate and your single-qubit pulses, so your fidelity here sets the success rate there.',
      button: 'Finish mission',
    },
  ];

  const cal = store.calibration;
  if (cal?.msDuration) { duration = cal.msDuration; durSlider.set(duration * 1e6); }
  showCounts([0, 0, 0, 0], 0);
  update();
  return {
    steps,
    frame(dt) {
      t += dt;
      const d = rock * 0.15 * Math.sin(t * 6);
      ions[0].dx = d; ions[1].dx = d; // in-phase (centre-of-mass) mode
      lab.tick(dt); lab.draw(); b1.draw(); b2.draw();
    },
    dispose() { lab.dispose(); plot.dispose(); b1.dispose(); b2.dispose(); },
  };
}
