// Experiment 8 — Missions.
// Small quantum algorithms run on the student's own calibrated gates:
// Grover's search, Deutsch–Jozsa and teleportation. Each shows the success
// rate with the student's calibration next to ideal gates.

import { el, slider, button, segmented, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel, ketHtml } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import { idealCalibration } from '../core/pulses.js';
import * as Cx from '../core/circuits.js';

export const meta = {
  id: 'missions', number: 8, title: 'Missions',
  concept: 'Grover, Deutsch–Jozsa, teleportation',
  mission: 'Solve each with your calibrated gates',
};

const ORACLES = ['const0', 'const1', 'identity', 'not'];

export function create(ctx) {
  const { rng, store } = ctx;
  const saved = store.calibration;
  const ideal = idealCalibration(ctx.machine.rabi);
  const mine = saved?.tPi ? { rabi: ctx.machine.rabi, tPi: saved.tPi, tHalf: saved.tHalf ?? saved.tPi / 2, msTheta: saved.msTheta ?? Math.PI / 2 } : null;
  const cal = mine || ideal;
  let puzzle = 'grover';
  let marked = rng.int(4), oracle = ORACLES[rng.int(4)], theta = 1.0;
  let busy = false;
  const results = { grover: null, dj: null, teleport: null };
  const solved = { grover: false, dj: false, teleport: false };

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const ions = [{ x: -0.45, glow: 0.6, label: 'A' }, { x: 0, glow: 0.6, label: 'B' }, { x: 0.45, glow: 0.6, label: 'C' }];
  const beams = ions.map((_, i) => ({ id: '729', on: 0, target: i }));
  const det = ions.map((_, i) => ({ id: '397', on: 0.3, angle: Math.PI / 5, target: i }));
  lab.setBeams([...det, ...beams]); lab.setIons(ions); lab.setCamera(true, 0.6);

  const circuit = new CircuitView(ctx.card('Circuit', { help: 'the algorithm' }), { qubits: 2, scroll: true });
  const compiledCard = ctx.card('Compiled into pulses', { depth: 'understand', help: 'what the lasers actually do' });
  const compiledView = new CircuitView(compiledCard, { qubits: 2, scroll: true });
  const plot = new Plot(ctx.card('Outcomes: your gates vs ideal'), { label: 'Outcome histogram' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roCal = readout('Running on', mine ? `your calibration (π = ${fmt.us(mine.tPi, 2)}, MS θ = ${fmt.pi(mine.msTheta)})` : 'ideal gates (calibrate in experiments 4 and 6)');
  const roPulses = readout('Laser pulses in this circuit'); const roMine = readout('Success with your gates'); const roIdeal = readout('Success with ideal gates');
  nums.append(roCal.el, roPulses.el, roMine.el, roIdeal.el);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  // ---- controls ----
  const seg = segmented({ id: 'puzzle', label: 'Mission', options: [{ value: 'grover', label: 'Grover' }, { value: 'dj', label: 'Deutsch–Jozsa' }, { value: 'teleport', label: 'Teleport' }], value: 'grover', onChange: (v) => { puzzle = v; update(); } });
  const runBtn = button('Run 100 shots', run, { primary: true });
  const newBtn = button('New puzzle', () => { marked = rng.int(4); oracle = ORACLES[rng.int(4)]; results[puzzle] = null; update(); });
  const thetaSlider = slider({ id: 'theta', label: 'Message state: angle from |0⟩', min: 0, max: 180, step: 5, value: 57, format: (v) => `${v}°`, onInput: (v) => { theta = (v * Math.PI) / 180; update(); } });
  const answerRow = el('div', { class: 'controls-row' });
  const roResult = readout('Result', '—');
  ctx.controls.append(el('div', { class: 'controls-row' }, seg.el, runBtn, newBtn), thetaSlider.el, answerRow, roResult.el);

  const current = () => (puzzle === 'grover' ? Cx.grover2(marked) : puzzle === 'dj' ? Cx.deutschJozsa(oracle) : Cx.teleport(theta));

  function logicalColumns(c) {
    return c.ops.map((op) => {
      if (op.g === 'M') return [{ q: op.q[0], kind: 'measure' }];
      if (op.g === 'CNOT') return [{ q: op.q, kind: 'cnot' }];
      if (op.g === 'CZ') return [{ q: op.q, label: 'CZ', kind: 'ms' }];
      const label = op.g === 'RY' ? `Ry(${fmt.deg(op.theta)})` : op.g;
      return [{ q: op.q[0], label, sub: op.cond !== undefined ? `if b${op.cond}` : undefined, kind: op.g === 'Z' || op.g === 'S' ? 'vz' : 'pulse' }];
    });
  }
  function compiledColumns(ops) {
    return ops.map((o) => {
      if (o.kind === 'M') return [{ q: o.q, kind: 'measure' }];
      if (o.kind === 'ms') return [{ q: o.q, label: 'MS', sub: fmt.pi(o.theta), kind: 'ms' }];
      if (o.kind === 'vz') return [{ q: o.q, label: o.label, kind: 'vz' }];
      return [{ q: o.q, label: o.label, sub: fmt.us(o.duration, 1), kind: 'pulse' }];
    });
  }

  function successOf(c, calib, shots = 400) {
    // Probability of the right answer, from the compiled circuit.
    if (puzzle === 'teleport') { let f = 0; for (let i = 0; i < 60; i++) f += Cx.blochFidelity(Cx.runCompiled(Cx.compile(c, calib), 3, calib, rng).state, 2, c.targetBloch); return f / 60; }
    const st = Cx.runCompiled(Cx.compile(c, calib), 2, calib, rng).state;
    return puzzle === 'grover' ? st.probabilities()[marked] : (c.balanced ? st.prob1(0) : 1 - st.prob1(0));
  }

  function update() {
    const c = current();
    const n = c.n;
    thetaSlider.el.hidden = puzzle !== 'teleport';
    newBtn.hidden = puzzle === 'teleport';
    ions[2].hidden = n < 3; det[2].on = n < 3 ? 0 : 0.3;
    circuit.setCircuit(logicalColumns(c), { qubits: n, labels: Array.from({ length: n }, () => '|0⟩') });
    const ops = Cx.compile(c, cal);
    compiledView.setCircuit(compiledColumns(ops), { qubits: n, labels: Array.from({ length: n }, () => '|0⟩') });
    roPulses.set(String(Cx.pulseCount(ops)));
    const pm = successOf(c, cal), pi = successOf(c, ideal);
    roMine.set(fmt.pct(pm, 1)); roMine.setClass(pm >= 0.8 ? 'is-good' : pm < 0.6 ? 'is-bad' : '');
    roIdeal.set(fmt.pct(pi, 1));
    // answer buttons
    answerRow.replaceChildren();
    if (puzzle === 'grover') answerRow.append(el('span', { class: 'muted', text: 'Which card is marked?' }), ...[0, 1, 2, 3].map((k) => button(`|${k.toString(2).padStart(2, '0')}⟩`, () => answer(k))));
    else if (puzzle === 'dj') answerRow.append(el('span', { class: 'muted', text: 'The mystery box is…' }), button('constant', () => answer('constant')), button('balanced', () => answer('balanced')));
    const r = results[puzzle];
    drawPlot(c, r);
    const st = Cx.runIdeal(c, rng).state;
    math.set([
      { title: c.name, html: puzzle === 'grover'
        ? '<span class="eq">H⊗H puts all four cards in superposition; the oracle flips the sign of the marked one; the diffusion step reflects every amplitude about the average. With 4 items, one reflection sends all the amplitude to the marked card.</span>'
        : puzzle === 'dj'
          ? '<span class="eq">The second qubit in |−⟩ turns “add f(x)” into a sign flip (−1)<sup>f(x)</sup>. A constant f leaves the first qubit in |+⟩ (reads 0); a balanced f flips it to |−⟩ (reads 1). One query decides.</span>'
          : '<span class="eq">A and B are measured in the Bell basis; the two classical bits tell C which of X and Z to apply. C ends up in A’s state although nothing quantum travelled from A to C.</span>' },
      { title: 'Ideal final state (before measurement, one sample for teleportation)', html: ketHtml(st) },
    ]);
    lab.setCaption(`${c.name}. ${Cx.pulseCount(ops)} laser pulses.`);
    ctx.mission?.poll();
  }

  function drawPlot(c, r) {
    const n = c.n;
    const labels = Array.from({ length: 1 << n }, (_, i) => i.toString(2).padStart(n, '0'));
    const series = [];
    if (r) {
      series.push({ name: 'your gates', kind: 'bars', points: r.mine.map((v, i) => [i - 0.18, v]), color: COLORS.accent, barWidth: 14 });
      series.push({ name: 'ideal gates', kind: 'bars', points: r.ideal.map((v, i) => [i + 0.18, v]), color: COLORS.muted, barWidth: 14, alpha: 0.5 });
    }
    plot.setData({ series, xLabel: puzzle === 'teleport' ? 'measured bits of A, B, C' : 'measured outcome', yLabel: 'fraction of shots', xRange: [-0.6, labels.length - 0.4], yRange: [0, 1.05], xTicks: labels.map((l, i) => ({ x: i, label: l })), vlines: puzzle === 'grover' && r ? [{ x: marked, label: 'marked', color: COLORS.success }] : [] });
  }

  async function run() {
    if (busy) return;
    busy = true; runBtn.disabled = true;
    const c = current();
    const ops = Cx.compile(c, cal);
    // animate the compiled pulses on the ions
    ions.forEach((i) => { i.glow = 0; }); det.forEach((d) => { d.on = 0; }); lab.setCamera(true, 0);
    const per = Math.max(25, Math.min(80, 2000 / ops.length));
    for (const o of ops) {
      if (o.kind === 'vz') continue;
      const targets = o.kind === 'ms' ? o.q : [o.q];
      if (o.kind === 'M') { det[o.q].on = 1; ions[o.q].glow = 0.7; lab.emit(o.q, 2); await ctx.animate({ duration: per * 2, onFrame: () => {} }); det[o.q].on = 0; ions[o.q].glow = 0; continue; }
      targets.forEach((q) => { beams[q].on = 1; });
      await ctx.animate({ duration: per, onFrame: () => {} });
      targets.forEach((q) => { beams[q].on = 0; });
    }
    const shots = 100;
    const size = 1 << c.n;
    const mineCounts = new Array(size).fill(0), idealCounts = new Array(size).fill(0);
    let fMine = 0, fIdeal = 0;
    for (let s = 0; s < shots; s++) {
      const a = Cx.runCompiled(ops, c.n, cal, rng); const b = Cx.runCompiled(Cx.compile(c, ideal), c.n, ideal, rng);
      if (puzzle === 'teleport') {
        fMine += Cx.blochFidelity(a.state, 2, c.targetBloch); fIdeal += Cx.blochFidelity(b.state, 2, c.targetBloch);
        const ia = a.state.sampleOne(rng), ib = b.state.sampleOne(rng);
        mineCounts[ia]++; idealCounts[ib]++;
      } else { mineCounts[a.state.sampleOne(rng)]++; idealCounts[b.state.sampleOne(rng)]++; }
    }
    const r = { mine: mineCounts.map((v) => v / shots), ideal: idealCounts.map((v) => v / shots), fMine: fMine / shots, fIdeal: fIdeal / shots, marked, oracle, theta };
    results[puzzle] = r;
    det.forEach((d, i) => { d.on = i < c.n ? 1 : 0; }); ions.forEach((ion, i) => { ion.glow = i < c.n ? 1 - (puzzle === 'teleport' ? 0.5 : r.mine.reduce((acc, v, k) => acc + v * ((k >> (c.n - 1 - i)) & 1), 0)) : 0; });
    await ctx.animate({ duration: 500, onFrame: () => { ions.forEach((ion, i) => { if (i < c.n && Math.random() < 0.5 * ion.glow) lab.emit(i, 1); }); } });
    det.forEach((d, i) => { d.on = i < c.n ? 0.3 : 0; }); ions.forEach((ion) => { ion.glow = 0.6; }); lab.setCamera(true, 0.6);
    if (puzzle === 'teleport') {
      roResult.set(`C matches the message with fidelity ${fmt.pct(r.fMine, 1)} (ideal ${fmt.pct(r.fIdeal, 1)})`);
      if (r.fMine >= 0.9) solved.teleport = true;
    } else {
      const top = r.mine.indexOf(Math.max(...r.mine));
      roResult.set(`most common outcome |${top.toString(2).padStart(c.n, '0')}⟩ (${fmt.pct(r.mine[top], 0)})`);
    }
    store.log('run', { experiment: meta.id, puzzle, success: puzzle === 'teleport' ? r.fMine : successOf(c, cal) });
    busy = false; runBtn.disabled = false;
    update();
    ctx.mission?.event('run', { puzzle, ...r });
  }

  function answer(a) {
    const r = results[puzzle];
    if (!r) { ctx.notify('Run the circuit first'); return; }
    let right;
    if (puzzle === 'grover') right = a === r.marked;
    else right = (a === 'balanced') === Cx.deutschJozsa(r.oracle).balanced;
    if (right) { solved[puzzle] = true; ctx.notify('Correct!'); } else ctx.notify(puzzle === 'grover' ? `No: the marked card was |${r.marked.toString(2).padStart(2, '0')}⟩` : `No: the box was ${Cx.deutschJozsa(r.oracle).balanced ? 'balanced' : 'constant'}`);
    store.log('answer', { experiment: meta.id, puzzle, right });
    if (!right) { marked = rng.int(4); oracle = ORACLES[rng.int(4)]; results[puzzle] = null; update(); }
    ctx.mission?.poll();
  }

  const steps = [
    {
      id: 'intro', kind: 'info', title: 'Your gates, real algorithms',
      text: mine ? `Everything here runs on the pulses you calibrated: π = ${fmt.us(mine.tPi, 2)}, π/2 = ${fmt.us(mine.tHalf, 2)}, entangling gate θ = ${fmt.pi(mine.msTheta)}. Ideal gates are shown alongside so you can see what your calibration costs.` : 'You have not calibrated gates yet, so this runs on ideal pulses. Do experiments 4 and 6 to run it on your own machine.',
      why: 'CNOT does not exist as a single laser pulse on a trapped-ion machine. It is compiled into one Mølmer–Sørensen gate plus four single-qubit pulses, and H into a virtual Z plus a π/2 pulse. The “compiled” view shows the real pulse sequence.',
    },
    {
      id: 'grover', kind: 'task', title: 'Find the marked card in one query',
      text: 'One of four cards is marked, but you may only ask the oracle once. Classically, one question finds it a quarter of the time. Run Grover’s circuit and <b>name the marked card</b>.',
      check: () => ({ done: solved.grover, hint: results.grover ? 'Now answer: which card?' : null }),
      doneText: 'Found in one query.',
      doneDetail: () => `The oracle was called once. With your gates the right answer comes up ${fmt.pct(successOf(Cx.grover2(marked), cal), 0)} of the time; ideal gates give 100 %.`,
    },
    {
      id: 'dj', kind: 'task', title: 'Constant or balanced?',
      text: 'The mystery box computes a one-bit function f. It is either <b>constant</b> (same output for both inputs) or <b>balanced</b> (different outputs). Classically you need two queries. Run Deutsch–Jozsa once and <b>decide</b>.',
      onEnter: () => { seg.set('dj'); puzzle = 'dj'; update(); },
      check: () => ({ done: solved.dj, hint: results.dj ? 'Qubit A reads 0 for constant, 1 for balanced.' : null }),
      doneText: 'One query instead of two.',
      doneDetail: 'The box was queried on both inputs at once, in superposition, and interference turned the answer into a single bit.',
    },
    {
      id: 'teleport', kind: 'task', title: 'Teleport a state',
      text: 'Send the state of ion A to ion C using an entangled pair and two classical bits. Choose a message angle and run. Success is C’s fidelity with the message: reach <b>90 %</b>.',
      onEnter: () => { seg.set('teleport'); puzzle = 'teleport'; update(); },
      check: () => ({ done: solved.teleport, hint: results.teleport ? `Fidelity ${fmt.pct(results.teleport.fMine, 1)}${results.teleport.fMine < 0.9 ? ' — better calibration in experiments 4 and 6 would raise this' : ''}` : null }),
      doneText: 'Teleported.',
      doneDetail: 'Nothing physical moved from A to C, and A’s original state was destroyed by the measurement. Yet C now carries it exactly, up to your gate errors. This is the basic operation of quantum networks.',
    },
    {
      id: 'wrap', kind: 'info', title: 'The whole machine',
      text: 'Trap, cool, prepare, pulse, entangle, read out: every mission in this lab was one of those steps, and the algorithms are just those steps in the right order. The gap between “your gates” and “ideal gates” is what the field is working to close.',
      button: 'Finish mission',
    },
  ];

  update();
  return {
    steps,
    frame(dt) { lab.tick(dt); lab.draw(); },
    dispose() { lab.dispose(); plot.dispose(); },
  };
}
