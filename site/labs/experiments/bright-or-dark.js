// Experiment 3 — Bright or Dark.
// Measurement is a photon-counting experiment. One shot gives one noisy
// number; only many shots give probabilities. The student picks a detection
// time and a threshold that identify a mystery state with 99 % accuracy.

import { el, slider, button, segmented, readout, fmt, click as photonClick } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { CircuitView } from '../framework/views/circuit.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import * as D from '../core/detection.js';

export const meta = {
  id: 'bright-or-dark', number: 3, title: 'Bright or Dark',
  concept: 'Measurement and probability',
  mission: 'Tell 0 from 1 with 99 % accuracy',
};

export function create(ctx) {
  const { rng, store } = ctx;
  let prep = '0';            // '0' | '1' | 'mystery'
  let mystery = rng.int(2);  // hidden truth for the mystery state
  let tDetect = 100e-6;
  let shots = 1;
  let threshold = 3;
  let busy = false;
  let data = { t: tDetect, zero: [], one: [] }; // photon counts per prepared state at the current detection time
  let last = null;           // { prep, counts, truth }
  let mysteryShot = null;    // { count, truth }
  let streak = 0, mysteryTotal = 0, mysteryRight = 0;
  const audio = store.settings.sound ? new (window.AudioContext || window.webkitAudioContext)() : null;

  // ---- views ----
  const lab = new LabScene(ctx.lab);
  const beam = { id: '397', on: 0, label: '397 nm detection', angle: Math.PI / 5 };
  lab.setBeams([beam]);
  lab.setIons([{ x: 0, glow: 0, label: '40Ca+' }]);
  lab.setCamera(true, 0);

  const circuit = new CircuitView(ctx.card('Circuit'), { qubits: 1, labels: ['|0⟩'] });
  const plot = new Plot(ctx.card('Photon-count histogram', { help: 'at the current detection time' }), { label: 'Histogram of photon counts for the two prepared states' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roMeans = readout('Mean photons (bright / dark)'); const roAcc = readout('Expected accuracy of your rule'); const roBest = readout('Best threshold at this time');
  nums.append(roMeans.el, roAcc.el, roBest.el);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  // ---- controls ----
  const prepSeg = segmented({ id: 'prep', label: 'Prepare', options: [{ value: '0', label: 'Prepare |0⟩' }, { value: '1', label: 'Prepare |1⟩' }, { value: 'mystery', label: 'Mystery' }], value: '0', onChange: (v) => { prep = v; if (v === 'mystery') newMystery(); update(); } });
  const timeSlider = slider({ id: 'tdet', label: 'Detection time', min: 20, max: 1000, step: 10, value: 100, format: (v) => `${v} µs`, onInput: (v) => { tDetect = v * 1e-6; if (data.t !== tDetect) { data = { t: tDetect, zero: [], one: [] }; } update(); } });
  const thSlider = slider({ id: 'th', label: 'Threshold: more photons than this ⇒ bright', min: 0, max: 40, step: 1, value: 3, format: (v) => `${v} photons`, onInput: (v) => { threshold = v; update(); } });
  const shotsSeg = segmented({ id: 'shots', label: 'Shots', options: [{ value: 1, label: '1 shot' }, { value: 20, label: '20' }, { value: 200, label: '200' }], value: 1, onChange: (v) => { shots = Number(v); } });
  const detectBtn = button('Detect', detect, { primary: true });
  const newBtn = button('New mystery', () => { newMystery(); update(); });
  const lockBtn = button('Lock in answer', lockAnswer);
  const roResult = readout('Last shot', '—');
  const roRule = readout('Your rule says', '—');
  const roStreak = readout('Mystery streak', '0');
  ctx.controls.append(
    el('div', { class: 'controls-row' }, prepSeg.el, newBtn),
    el('div', { class: 'controls-grid' }, timeSlider.el, thSlider.el),
    el('div', { class: 'controls-row' }, detectBtn, shotsSeg.el, lockBtn),
    roResult.el, roRule.el, roStreak.el,
  );

  function newMystery() { mystery = rng.int(2); mysteryShot = null; roResult.set('—'); roRule.set('—'); }
  const truthOf = () => (prep === 'mystery' ? mystery : Number(prep));
  const pBright = () => (truthOf() === 0 ? 1 : 0);

  function update() {
    const means = D.photonMeans(tDetect);
    const acc = D.expectedAccuracy(threshold, tDetect);
    const best = D.bestThreshold(tDetect);
    roMeans.set(`${means.bright.toFixed(1)} / ${means.dark.toFixed(2)}`);
    roAcc.set(fmt.pct(acc, 2)); roAcc.setClass(acc >= 0.99 ? 'is-good' : '');
    roBest.set(`${best.threshold} photons → ${fmt.pct(best.accuracy, 2)}`);
    newBtn.hidden = prep !== 'mystery'; lockBtn.hidden = prep !== 'mystery';
    lockBtn.disabled = !mysteryShot;
    circuit.setCircuit([
      [prep === '1' ? { q: 0, label: 'X', sub: 'π pulse', kind: 'pulse' } : prep === 'mystery' ? { q: 0, label: '?', sub: 'hidden', kind: 'vz' } : { q: 0, label: 'I', sub: 'nothing', kind: 'vz' }],
      [{ q: 0, kind: 'measure' }],
    ]);
    // histogram
    const maxBin = Math.max(12, Math.ceil(means.bright + 4 * Math.sqrt(means.bright)));
    const h0 = D.histogram(data.zero, maxBin), h1 = D.histogram(data.one, maxBin);
    const bars = (h, total, dx) => Array.from(h, (n, k) => [k + dx, total ? n / total : 0]).filter((p) => p[1] > 0);
    const series = [];
    if (data.zero.length) series.push({ name: `prepared |0⟩ (${data.zero.length})`, kind: 'bars', points: bars(h0, data.zero.length, -0.2), color: COLORS.accent, barWidth: 6 });
    if (data.one.length) series.push({ name: `prepared |1⟩ (${data.one.length})`, kind: 'bars', points: bars(h1, data.one.length, 0.2), color: COLORS.accent2, barWidth: 6 });
    if (ctx.depth !== 'explore') {
      const pm = (lam) => Array.from({ length: maxBin + 1 }, (_, k) => [k, D.poissonPmf(k, lam)]);
      series.push({ name: 'Poisson model', points: pm(means.bright), color: 'rgba(56,189,248,0.6)', width: 1, dash: [3, 3] });
      series.push({ points: pm(means.dark), color: 'rgba(244,114,182,0.6)', width: 1, dash: [3, 3] });
    }
    plot.setData({ series, xLabel: 'photons counted in one shot', yLabel: 'fraction of shots', xRange: [-0.5, maxBin + 0.5], yRange: [0, Math.max(0.3, ...series.flatMap((s) => s.points.map((p) => p[1])) ) * 1.1], vlines: [{ x: threshold + 0.5, label: 'threshold', color: COLORS.warn }] });
    math.set([
      { title: 'Poisson statistics', html: `<span class="eq">P(k photons) = λ<sup>k</sup> e<sup>−λ</sup> / k!</span><span class="eq">λ<sub>bright</sub> = ${means.bright.toFixed(2)}, λ<sub>dark</sub> = ${means.dark.toFixed(3)} at t = ${fmt.us(tDetect, 0)}</span>` },
      { title: 'Error of the threshold rule', html: `<span class="eq">P(error) = ½·P(k ≤ ${threshold} | bright) + ½·P(k > ${threshold} | dark)</span><span class="eq">= ½·${D.poissonCdf(threshold, means.bright).toExponential(2)} + ½·${(1 - D.poissonCdf(threshold, means.dark)).toExponential(2)} = ${(1 - acc).toExponential(2)}</span><div class="note">Bright rate 50 photons/ms, dark (background) 0.5 photons/ms. Real detection also loses some bright ions to decay of the metastable D<sub>5/2</sub> level during long windows; ignored here.</div>` },
    ]);
    lab.setCaption(prep === 'mystery' ? 'Mystery state loaded. Detect, then decide with your threshold.' : `Ion prepared in |${prep}⟩. Detection ${fmt.us(tDetect, 0)}.`);
    ctx.mission?.poll();
  }

  async function detect() {
    if (busy) return;
    busy = true; detectBtn.disabled = true;
    const truth = truthOf();
    const { counts } = D.simulateShots(pBright(), shots, tDetect, rng);
    beam.on = 1;
    const bright = truth === 0;
    // animate: photons arrive during the window
    const n = counts[counts.length - 1];
    lab.setIons([{ x: 0, glow: bright ? 1 : 0.05, label: '40Ca+' }]); lab.setCamera(true, bright ? Math.min(1, n / 8) : 0.03);
    let emitted = 0;
    await ctx.animate({ duration: shots === 1 ? 700 : 900, ease: (t) => t, onFrame: (t) => { const target = Math.round(t * Math.min(n, 30)); while (emitted < target) { lab.emit(0, 1); photonClick(true, audio); emitted++; } } });
    beam.on = 0; lab.setIons([{ x: 0, glow: 0, label: '40Ca+' }]); lab.setCamera(true, 0);
    if (prep !== 'mystery') { (truth === 0 ? data.zero : data.one).push(...counts); }
    else { mysteryShot = { count: n, truth }; }
    last = { prep, counts: Array.from(counts), truth, t: tDetect };
    roResult.set(shots === 1 ? `${n} photons → ${n > threshold ? 'BRIGHT' : 'DARK'}` : `${shots} shots, mean ${(counts.reduce((a, b) => a + b, 0) / shots).toFixed(1)} photons`);
    if (prep === 'mystery') roRule.set(n > threshold ? '|0⟩ (bright)' : '|1⟩ (dark)');
    ctx.announce(roResult.el.textContent);
    store.log('detect', { experiment: meta.id, prep, shots, tDetect, threshold });
    busy = false; detectBtn.disabled = false;
    update();
    ctx.mission?.event('detect', last);
  }

  function lockAnswer() {
    if (!mysteryShot) return;
    const guess = mysteryShot.count > threshold ? 0 : 1;
    const right = guess === mysteryShot.truth;
    mysteryTotal++; if (right) { mysteryRight++; streak++; } else streak = 0;
    roStreak.set(`${streak} in a row (${mysteryRight}/${mysteryTotal})`); roStreak.setClass(right ? 'is-good' : 'is-bad');
    ctx.notify(right ? `Correct: it was |${mysteryShot.truth}⟩` : `Wrong: it was |${mysteryShot.truth}⟩`);
    store.log('mystery', { experiment: meta.id, right, threshold, tDetect });
    newMystery(); update();
    ctx.mission?.event('lock', { right });
  }

  const steps = [
    {
      id: 'one-shot', kind: 'task', title: 'Look at the ion',
      text: 'Detection means shining the violet 397 nm laser and counting photons. Prepare <b>|0⟩</b> and press <b>Detect</b>, then prepare <b>|1⟩</b> and detect again.',
      check: () => ({ done: data.zero.length > 0 && data.one.length > 0, hint: data.zero.length ? 'Now prepare |1⟩ and detect.' : null }),
      doneText: 'Bright means |0⟩, dark means |1⟩.',
      doneDetail: 'Now look at the numbers: the bright ion did not give the same count each time you looked. Photons arrive at random.',
      why: 'In |0⟩ the ion absorbs and re-emits 397 nm photons millions of times per second, and the camera catches a small fraction. In |1⟩ (the D<sub>5/2</sub> level) it cannot absorb 397 nm light at all, so it stays dark apart from stray light.',
    },
    {
      id: 'predict-spread', kind: 'predict', title: 'Same ion, same state, 20 looks',
      text: 'Prepare |0⟩ and detect it <b>20 times</b> at 100 µs. The photon count will be…',
      options: ['Exactly the same every time', 'Spread out around an average', 'Either zero or a maximum, nothing in between'],
      on: 'detect', afterLock: 'Select 20 shots and press Detect.',
      resolve: (guess, _c, d) => (d && d.prep === '0' && d.counts.length >= 20 ? { correct: guess === 1, text: `The counts spread out around an average (about ${D.photonMeans(d.t).bright.toFixed(0)} at ${fmt.us(d.t, 0)}). Photons arrive at random moments, so the number caught in a fixed window follows a <b>Poisson distribution</b>.` } : null),
    },
    {
      id: 'histograms', kind: 'task', title: 'Build both histograms',
      text: 'Collect <b>200 shots</b> of |0⟩ and 200 of |1⟩ at 100 µs so the histogram shows both humps.',
      check: () => ({ done: data.zero.length >= 200 && data.one.length >= 200, progress: Math.min(1, (Math.min(200, data.zero.length) + Math.min(200, data.one.length)) / 400) }),
      doneText: 'Two humps, one rule.',
      doneDetail: 'Any threshold between the humps sorts bright from dark. The thin tails that cross the threshold are your measurement errors.',
    },
    {
      id: 'predict-time', kind: 'predict', title: 'A shorter look',
      text: 'Shorten the detection time to <b>20 µs</b> and collect 200 shots of |0⟩. Compared with 100 µs, the bright hump will…',
      options: ['Move to higher counts', 'Move down and overlap the dark hump', 'Stay where it is'],
      on: 'detect', afterLock: 'Set 20 µs, prepare |0⟩, 200 shots, Detect.',
      resolve: (guess, _c, d) => (d && d.t <= 30e-6 && d.prep === '0' && d.counts.length >= 100 ? { correct: guess === 1, text: 'At 20 µs the bright ion gives only about one photon on average, so bright and dark overlap and no threshold can separate them well. Longer detection separates the humps but costs time, and in a real machine, time is also decoherence.' } : null),
    },
    {
      id: 'mystery', kind: 'task', title: 'Identify the mystery state',
      text: 'Choose a detection time and threshold whose expected accuracy is <b>at least 99 %</b>, then switch to <b>Mystery</b>, detect one shot, and lock in your answer. Get <b>3 in a row</b> right.',
      check: () => { const acc = D.expectedAccuracy(threshold, tDetect); return { done: acc >= 0.99 && streak >= 3, progress: Math.min(1, (acc >= 0.99 ? 0.5 : 0) + streak / 6), hint: `Your rule's expected accuracy: <b>${fmt.pct(acc, 2)}</b>${acc >= 0.99 ? '' : ' (need 99 %: longer time, threshold between the humps)'}. Streak: ${streak}/3.` }; },
      doneText: '99 % is a real measurement.',
      doneDetail: () => `Detection ${fmt.us(tDetect, 0)}, threshold ${threshold}: ${fmt.pct(D.expectedAccuracy(threshold, tDetect), 2)} expected accuracy. Real trapped-ion machines reach 99.9 % with a few hundred microseconds.`,
    },
    {
      id: 'wrap', kind: 'info', title: 'One shot, one answer',
      text: 'A single measurement never tells you a probability. It tells you bright or dark, and even that with a small chance of error. Probabilities only appear after many shots, which is why every later experiment has a shots setting.',
      button: 'Finish mission',
    },
  ];

  update();
  return {
    steps,
    frame(dt) { lab.tick(dt); lab.draw(); },
    dispose() { lab.dispose(); plot.dispose(); audio?.close?.(); },
  };
}
