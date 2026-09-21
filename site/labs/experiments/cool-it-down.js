// Experiment 2 — Cool It Down.
// Doppler cooling: a laser tuned below resonance slows the ion because a
// moving ion sees the light shifted onto resonance only when it moves
// against the beam. Photon recoil sets the floor, the Doppler limit.

import { el, slider, button, readout, fmt } from '../framework/ui.js';
import { LabScene } from '../framework/views/lab2d.js';
import { Plot } from '../framework/views/plot.js';
import { MathPanel } from '../framework/views/math-panel.js';
import { COLORS } from '../framework/views/canvas.js';
import { CoolingSim, equilibriumTemperature, coolingPower, GAMMA, DOPPLER_LIMIT_K } from '../core/cooling.js';
import { KB } from '../core/constants.js';

export const meta = {
  id: 'cool-it-down', number: 2, title: 'Cool It Down',
  concept: 'Doppler laser cooling',
  mission: 'Reach the cooling limit',
};

const T0 = 1;                // K, temperature right after loading
const SIM_RATE = 20e-6;      // simulated seconds per real second
const T_MIN = 1e-4, T_MAX = 10; // thermometer range, K (log)

export function create(ctx) {
  const { store } = ctx;
  let detuningMHz = -30, power = 40;  // slider values
  const sim = new CoolingSim(T0);
  let running = false;
  let loaded = false;
  let coldSince = null;
  let heatedNotified = false;
  const history = [];
  let t = 0, jx = 0, jy = 0;

  const lab = new LabScene(ctx.lab);
  const beam = { id: '397', on: 0.6, label: '397 nm cooling laser', angle: 0 };
  lab.setBeams([beam]);
  const ion = { x: 0, glow: 0.3, label: '40Ca+', dx: 0, dy: 0 };
  lab.setIons([ion]); lab.showTrail = true;

  const gaugeCard = ctx.card('Thermometer');
  const needle = el('div', { class: 'gauge-needle' });
  const gaugeVal = el('div', { class: 'mono', style: { minWidth: '80px', textAlign: 'right', fontWeight: '700' } });
  const dopplerTick = el('div', { class: 'gauge-tick', style: { left: `${(Math.log10(DOPPLER_LIMIT_K / T_MIN) / Math.log10(T_MAX / T_MIN)) * 100}%` }, title: 'Doppler limit' });
  gaugeCard.append(el('div', { class: 'gauge' }, el('div', { class: 'gauge-track', style: { background: 'linear-gradient(90deg, #38bdf8, #4ade80 30%, #fbbf24 65%, #f87171)' } }, dopplerTick, needle), gaugeVal),
    el('div', { class: 'gauge-labels' }, el('span', { text: '100 µK' }), el('span', { text: '0.52 mK Doppler limit' }), el('span', { text: '10 K' })));
  const plot = new Plot(ctx.card('Temperature vs time'), { label: 'Temperature against simulated time' });
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roT = readout('Temperature'); const roEq = readout('Where these settings end up'); const roRate = readout('Photons scattered per second'); const roD = readout('Doppler limit', fmt.temp(DOPPLER_LIMIT_K));
  nums.append(roT.el, roEq.el, roRate.el, roD.el);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  const detSlider = slider({ id: 'det', label: 'Laser detuning from resonance', min: -80, max: 40, step: 1, value: -30, format: (v) => `${v > 0 ? '+' : ''}${v} MHz`, hint: 'red ← → blue', onInput: (v) => { detuningMHz = v; update(); } });
  const powSlider = slider({ id: 'pow', label: 'Laser power', min: 0, max: 100, step: 1, value: 40, format: (v) => `s = ${sat(v).toFixed(2)}`, onInput: (v) => { power = v; update(); } });
  const loadBtn = button('Load hot ion', () => { sim.reset(T0); history.length = 0; loaded = true; running = true; coldSince = null; heatedNotified = false; runBtn.textContent = 'Pause'; store.log('load', { experiment: meta.id }); update(); }, { primary: true });
  const runBtn = button('Pause', () => { running = !running; runBtn.textContent = running ? 'Pause' : 'Run'; });
  const roTime = readout('Simulated time', '0 µs');
  ctx.controls.append(el('div', { class: 'controls-grid' }, detSlider.el, powSlider.el), el('div', { class: 'controls-row' }, loadBtn, runBtn), roTime.el);

  function sat(v) { return 0.02 * 10 ** (v / 33.3); }  // saturation parameter, 0.02 … 20
  const detuning = () => 2 * Math.PI * detuningMHz * 1e6;

  function update() {
    const T = sim.temperature;
    const eq = equilibriumTemperature(detuning(), sat(power));
    gaugeVal.textContent = fmt.temp(T);
    const frac = Math.max(0, Math.min(1, Math.log10(T / T_MIN) / Math.log10(T_MAX / T_MIN)));
    needle.style.left = `${frac * 100}%`;
    roT.set(fmt.temp(T)); roT.setClass(T <= 1.2 * DOPPLER_LIMIT_K ? 'is-good' : '');
    roEq.set(Number.isFinite(eq) ? `${fmt.temp(eq)} (${(eq / DOPPLER_LIMIT_K).toFixed(2)} × limit)` : 'heating, no limit');
    roRate.set(`${(coolingPower(sim.E, detuning(), sat(power)).rate / 1e6).toFixed(2)} million`);
    beam.on = 0.25 + 0.6 * Math.min(1, sat(power) / 2);
    beam.label = `397 nm, ${detuningMHz > 0 ? '+' : ''}${detuningMHz} MHz`;
    const g = 2 * detuning() / GAMMA;
    math.set([
      { title: 'Scattering rate for velocity v', html: `<span class="eq">R(v) = (Γ/2) · s / (1 + s + (2(Δ − kv)/Γ)²)</span><span class="eq">force = ħk R(v), averaged over one oscillation of the ion; recoil heating = R · (ħk)²/m</span>` },
      { title: 'Steady state (cold ion)', html: `<span class="eq">k<sub>B</sub>T = ħΓ²(1 + s + (2Δ/Γ)²) / (8|Δ|)  for Δ < 0</span><span class="eq">minimum at Δ = −Γ/2, s → 0:  T<sub>D</sub> = ħΓ/2k<sub>B</sub> = ${fmt.temp(DOPPLER_LIMIT_K)}</span><span class="eq">now: Δ = ${g.toFixed(2)} × Γ/2, s = ${sat(power).toFixed(2)} → ${Number.isFinite(eq) ? fmt.temp(eq) : '∞'}</span><div class="note">Γ = 2π × 21.6 MHz for the 397 nm line of ⁴⁰Ca⁺. One beam, one direction of motion; the simulation runs ${(1 / SIM_RATE / 1e3).toFixed(0)},000 times slower than real time.</div>` },
    ]);
    plot.setData({ series: [{ name: 'temperature', points: history.map(([tt, TT]) => [tt * 1e6, Math.log10(TT)]), color: COLORS.accent }], xLabel: 'simulated time (µs)', yLabel: 'log₁₀ T (K)', xRange: [0, Math.max(100, (history.at(-1)?.[0] ?? 0) * 1e6)], yRange: [Math.log10(T_MIN), 1], hlines: [{ y: Math.log10(DOPPLER_LIMIT_K), label: 'Doppler limit', color: COLORS.success }] });
    lab.setCaption(loaded ? `${fmt.temp(T)} · ${running ? 'running' : 'paused'}` : 'No ion loaded.');
    ctx.mission?.poll();
  }

  const steps = [
    {
      id: 'predict-side', kind: 'predict', title: 'Which way?',
      text: 'A freshly loaded ion is hot: it races back and forth in the trap. To slow it with light, should the laser be tuned <b>below</b> the ion’s resonance (red), <b>above</b> it (blue), or exactly on it?',
      options: ['Below resonance (red)', 'Above resonance (blue)', 'Exactly on resonance'],
      on: 'lock',
      resolve: (guess) => ({ correct: guess === 0, text: 'Below. An ion moving <i>towards</i> the beam sees the light Doppler-shifted up, onto resonance, and absorbs a photon whose kick slows it. Moving away, it sees the light shifted further off resonance and is left alone. Red detuning turns the laser into a brake that only acts against the motion.' }),
    },
    {
      id: 'cool', kind: 'task', title: 'Cool it below 1 mK',
      text: '<b>Load a hot ion</b> and choose a detuning and power that bring it below <b>1 mK</b>. Watch the jitter shrink.',
      check: () => ({ done: loaded && sim.temperature < 1e-3, hint: loaded ? `Now ${fmt.temp(sim.temperature)}` : null }),
      doneText: 'A thousand times colder than the room.',
      doneDetail: 'Each scattered photon takes away a tiny bit of energy, but there are millions of them per second.',
    },
    {
      id: 'limit', kind: 'task', title: 'Reach the Doppler limit',
      text: `Get within <b>20 %</b> of the Doppler limit (${fmt.temp(DOPPLER_LIMIT_K)}) and stay there for <b>3 s</b>. Hint: a strong laser broadens the resonance.`,
      check: () => { const cold = loaded && sim.temperature <= 1.2 * DOPPLER_LIMIT_K; const dur = cold && coldSince !== null ? (performance.now() - coldSince) / 1000 : 0; return { done: dur >= 3, progress: Math.min(1, dur / 3), hint: loaded ? `${fmt.temp(sim.temperature)} = ${(sim.temperature / DOPPLER_LIMIT_K).toFixed(2)} × limit${cold ? '' : ' (try Δ = −11 MHz, low power)'}` : null }; },
      doneText: 'The Doppler limit.',
      doneDetail: 'Below this, every absorbed photon’s random recoil kick heats as much as the cooling removes. Getting colder needs different tricks (sideband cooling), which is how real machines reach the ground state of motion.',
    },
    {
      id: 'predict-blue', kind: 'predict', title: 'The other way',
      text: 'Now set the detuning to <b>+10 MHz</b> (blue). The cold ion will…',
      options: ['Stay cold', 'Heat up and rattle around', 'Cool even further'],
      on: 'heated', afterLock: 'Set +10 MHz and watch the thermometer.',
      resolve: (guess) => ({ correct: guess === 1, text: 'It heats up. Blue detuning makes the laser a gas pedal: the ion absorbs most when moving <i>away</i> from the beam and gets pushed faster. In a real lab a blue-detuned cooling laser can throw the ion out of the trap.' }),
    },
    {
      id: 'wrap', kind: 'info', title: 'Cold enough to compute',
      text: 'Doppler cooling brings a trapped ion from oven-hot to a fraction of a millikelvin in under a millisecond. Every experiment from here on starts with this step, done automatically between shots. Next: reading the qubit out.',
      button: 'Finish mission',
    },
  ];

  update();
  return {
    steps,
    frame(dt) {
      t += dt;
      if (loaded && running) {
        sim.step(dt * SIM_RATE, detuning(), sat(power));
        history.push([sim.time, sim.temperature]);
        if (history.length > 600) history.splice(0, history.length - 600);
        roTime.set(sim.time < 1e-3 ? `${(sim.time * 1e6).toFixed(0)} µs` : fmt.ms(sim.time, 2));
        const cold = sim.temperature <= 1.2 * DOPPLER_LIMIT_K;
        if (cold && coldSince === null) coldSince = performance.now();
        if (!cold) coldSince = null;
        if (detuningMHz > 0 && sim.temperature > 5 * DOPPLER_LIMIT_K && !heatedNotified) { heatedNotified = true; ctx.mission?.event('heated', {}); }
        if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) update();
      }
      // jitter amplitude follows log temperature
      const amp = loaded ? Math.max(0.02, Math.min(1, Math.log10(sim.temperature / (0.5 * T_MIN)) / Math.log10(T_MAX / (0.5 * T_MIN)))) : 0;
      jx += (Math.random() - 0.5) * 2; jy += (Math.random() - 0.5) * 2; jx *= 0.8; jy *= 0.8;
      ion.dx = amp * 0.9 * Math.sin(t * 12) * 0.6 + amp * 0.25 * jx; ion.dy = amp * 0.8 * Math.cos(t * 9.3) * 0.6 + amp * 0.25 * jy;
      ion.glow = loaded ? 0.25 + 0.6 * Math.min(1, coolingPower(sim.E, detuning(), sat(power)).rate / (GAMMA / 4)) : 0.05;
      ion.hidden = !loaded;
      lab.tick(dt); lab.draw();
    },
    dispose() { lab.dispose(); plot.dispose(); },
  };
}
