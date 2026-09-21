// Experiment 1 — Catch an Ion.
// A Paul trap holds a charged particle with an oscillating field. The ion
// is stable only inside a region of the (q, a) plane; outside it the orbit
// grows and the ion flies out. The motion here is the real Mathieu
// equation integrated live, so micromotion and secular motion both show.

import { el, slider, button, readout, fmt } from '../framework/ui.js';
import { CanvasView, COLORS } from '../framework/views/canvas.js';
import { MathPanel } from '../framework/views/math-panel.js';
import { mathieuParams, isStable, secularFrequency, stabilityMap, IonMotion, DEFAULT_TRAP } from '../core/trap.js';

export const meta = {
  id: 'catch-ion', number: 1, title: 'Catch an Ion',
  concept: 'Paul trap stability',
  mission: 'Hold an ion for 10 s',
};

const TRAP = { ...DEFAULT_TRAP, z0: 1.0e-3 };
const XI_RATE = 26; // radians of RF phase per real second (slowed down enormously so the motion is visible)

/** Cross-section of the four-rod trap with the ion moving in the x–y plane. */
class TrapView extends CanvasView {
  constructor(parent) {
    super(parent, { aspect: 16 / 10, minHeight: 240, label: 'Trap cross-section with the ion' });
    this.ion = null; this.trail = []; this.rfPhase = 0; this.loaded = false; this.escapeFx = null; this.ovenFx = 0; this.caption = '';
    this.init();
  }
  draw() {
    const { ctx, w, h } = this;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36; // R = r0 on screen
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.8);
    bg.addColorStop(0, '#132038'); bg.addColorStop(1, '#070b14');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // field shimmer: quadrupole lines whose brightness follows the RF phase
    const s = Math.cos(2 * this.rfPhase);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 1;
    // equipotentials of a quadrupole: x·y = ±c², one branch at a time
    for (let k = 1; k <= 4; k++) {
      const c2 = (R * 0.2 * k) ** 2;
      for (const sign of [1, -1]) for (const side of [1, -1]) {
        ctx.strokeStyle = `rgba(56,189,248,${0.10 + 0.08 * s * sign})`; ctx.beginPath();
        let started = false;
        for (let i = 1; i <= 40; i++) {
          const x = side * (i / 40) * 1.2 * R; const yy = (sign * c2) / x;
          if (Math.abs(yy) > R * 1.2) { started = false; continue; }
          started ? ctx.lineTo(cx + x, cy + yy) : ctx.moveTo(cx + x, cy + yy); started = true;
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    // four rods at the corners
    const rr = R * 0.3;
    [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy], i) => {
      const x = cx + sx * (R + rr) * 0.72, y = cy + sy * (R + rr) * 0.72;
      const g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.3, rr * 0.1, x, y, rr);
      const hot = i % 2 === 0 ? s : -s;
      g.addColorStop(0, `rgb(${150 + 60 * hot}, ${150 + 20 * hot}, ${170 - 40 * hot})`); g.addColorStop(1, '#2b3341');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.muted; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText(i % 2 === 0 ? '+RF' : '−RF', x, y + 4);
    });
    // r0 circle
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('r₀', cx + R + 4, cy - 4);
    // oven beam
    if (this.ovenFx > 0) { ctx.strokeStyle = `rgba(251,146,60,${this.ovenFx})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, cy + R * 0.9); ctx.lineTo(cx, cy); ctx.stroke(); ctx.fillStyle = `rgba(251,146,60,${this.ovenFx})`; ctx.fillText('oven', 8, cy + R * 0.9 - 8); }
    // trail
    if (this.trail.length > 1) { ctx.strokeStyle = 'rgba(165,243,252,0.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); this.trail.forEach((p, i) => (i ? ctx.lineTo(cx + p[0] * R, cy - p[1] * R) : ctx.moveTo(cx + p[0] * R, cy - p[1] * R))); ctx.stroke(); }
    // ion
    if (this.ion && !this.ion.escaped) {
      const x = cx + this.ion.x * R, y = cy - this.ion.y * R;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 26);
      gr.addColorStop(0, 'rgba(190,240,255,0.9)'); gr.addColorStop(0.3, 'rgba(120,200,255,0.35)'); gr.addColorStop(1, 'rgba(60,120,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0fbff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (this.escapeFx) { const t = this.escapeFx.t; ctx.strokeStyle = `rgba(251,191,36,${1 - t})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx + this.escapeFx.x * R, cy - this.escapeFx.y * R, 8 + t * 80, 0, Math.PI * 2); ctx.stroke(); }
    if (this.caption) { ctx.fillStyle = COLORS.text; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(this.caption, 12, h - 12); }
  }
}

/** The (q, a) stability map with the current operating point. */
class StabilityView extends CanvasView {
  constructor(parent) { super(parent, { aspect: 1.5, minHeight: 160, label: 'Stability diagram' }); this.point = [0, 0]; this.map = stabilityMap(); this.init(); }
  draw() {
    const { ctx, w, h } = this; const m = this.map;
    ctx.clearRect(0, 0, w, h);
    const padL = 34, padB = 26, padT = 8, padR = 8; const pw = w - padL - padR, ph = h - padT - padB;
    const X = (q) => padL + (q / m.qMax) * pw, Y = (a) => padT + ph - ((a - m.aMin) / (m.aMax - m.aMin)) * ph;
    const cw = pw / m.nq, ch = ph / m.na;
    for (let i = 0; i < m.na; i++) for (let j = 0; j < m.nq; j++) {
      ctx.fillStyle = m.cells[i * m.nq + j] ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.12)';
      ctx.fillRect(padL + j * cw, padT + ph - (i + 1) * ch, cw + 0.5, ch + 0.5);
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.strokeRect(padL, padT, pw, ph);
    ctx.fillStyle = COLORS.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('q  (RF voltage / frequency²)', padL + pw / 2, h - 6);
    [0, 0.5, 1].forEach((q) => ctx.fillText(String(q), X(q), padT + ph + 12));
    ctx.textAlign = 'right'; [m.aMin, 0, m.aMax].forEach((a) => ctx.fillText(a.toFixed(1), padL - 4, Y(a) + 4));
    ctx.save(); ctx.translate(10, padT + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText('a (DC)', 0, 0); ctx.restore();
    ctx.strokeStyle = COLORS.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(padL + pw, Y(0)); ctx.stroke(); ctx.setLineDash([]);
    const [q, a] = this.point;
    const x = Math.min(padL + pw, X(q)), y = Math.max(padT, Math.min(padT + ph, Y(a)));
    ctx.fillStyle = COLORS.accent2; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

export function create(ctx) {
  const { store } = ctx;
  let vRf = 300, fRf = 20e6, uDc = 0;
  const motion = new IonMotion();
  let loaded = false, held = 0, bestHeld = 0, escapes = 0, lastEscapeQ = null;

  const view = new TrapView(ctx.lab);
  const stab = new StabilityView(ctx.card('Stability diagram', { help: 'green = trapped' }));
  const nums = ctx.card('Numbers', { depth: 'understand' });
  const roQ = readout('q'); const roA = readout('a'); const roSec = readout('Secular frequency'); const roStable = readout('Prediction');
  nums.append(roQ.el, roA.el, roSec.el, roStable.el);
  const math = new MathPanel(ctx.card('The math', { depth: 'math' }));

  const vSlider = slider({ id: 'vrf', label: 'RF amplitude', min: 0, max: 1000, step: 10, value: 300, format: (v) => `${v} V`, onInput: (v) => { vRf = v; update(); } });
  const fSlider = slider({ id: 'frf', label: 'RF frequency', min: 5, max: 40, step: 0.5, value: 20, format: (v) => `${v} MHz`, onInput: (v) => { fRf = v * 1e6; update(); } });
  const dcSlider = slider({ id: 'udc', label: 'Endcap DC voltage', min: 0, max: 1000, step: 10, value: 0, format: (v) => `${v} V`, onInput: (v) => { uDc = v; update(); } });
  const loadBtn = button('Load ion', load, { primary: true });
  const roHeld = readout('Held for', '—');
  ctx.controls.append(el('div', { class: 'controls-grid' }, vSlider.el, fSlider.el, dcSlider.el, el('div', { class: 'controls-row', style: { alignSelf: 'end' } }, loadBtn)), roHeld.el);

  const params = () => mathieuParams({ vRf, fRf: fRf, uDc }, TRAP);

  function load() {
    const r = Math.random;
    motion.reset(0.25 * (r() - 0.5), 0.25 * (r() - 0.5), 0.06 * (r() - 0.5), 0.06 * (r() - 0.5));
    loaded = true; held = 0; view.trail = []; view.ovenFx = 1; view.escapeFx = null;
    store.log('load', { experiment: meta.id, vRf, fRf, uDc });
    update();
  }

  function update() {
    const { a, q } = params();
    const stable = isStable(a, q);
    stab.point = [q, a]; stab.draw();
    roQ.set(q.toFixed(3)); roA.set(a.toFixed(4));
    roSec.set(stable ? fmt.mhz(secularFrequency(a, q, fRf), 2) : '—');
    roStable.set(stable ? 'stable' : 'unstable'); roStable.setClass(stable ? 'is-good' : 'is-bad');
    math.set([
      { title: 'Mathieu equation', html: `<span class="eq">d²x/dξ² + (a − 2q cos 2ξ) x = 0,   ξ = Ωt/2</span><span class="eq">q = 2eV<sub>rf</sub> / (m r₀² Ω²) = ${q.toFixed(3)}</span><span class="eq">a = −2eκU<sub>dc</sub> / (m z₀² Ω²) = ${a.toFixed(4)}</span><span class="eq">ω<sub>sec</sub> ≈ (Ω/2)·√(a + q²/2) = 2π × ${stable ? fmt.mhz(secularFrequency(a, q, fRf), 2) : '—'}</span><div class="note">Trap: r₀ = ${(TRAP.r0 * 1e3).toFixed(1)} mm, z₀ = ${(TRAP.z0 * 1e3).toFixed(1)} mm, κ = ${TRAP.kappa}, ⁴⁰Ca⁺. Stability is decided from the Floquet multiplier of one RF period, not from an approximation. The animation is slowed by a factor of about 10⁷.</div>` },
    ]);
    view.caption = loaded ? (motion.escaped ? 'The ion is gone. Load another.' : `Trapped. q = ${q.toFixed(2)}${stable ? '' : ' — outside the stable region!'}`) : 'No ion. Press Load ion.';
    ctx.mission?.poll();
  }

  const steps = [
    {
      id: 'load', kind: 'task', title: 'Catch one',
      text: 'An oven sends a puff of calcium atoms through the trap and two lasers knock an electron off one of them. The charged ion feels the oscillating field of the four rods. Press <b>Load ion</b> and hold it for <b>10 seconds</b>.',
      check: () => ({ done: bestHeld >= 10, progress: Math.min(1, held / 10), hint: loaded && !motion.escaped ? `Held for ${held.toFixed(1)} s` : null }),
      doneText: 'Caught.',
      doneDetail: 'Look closely at the motion: a slow, smooth swing (the secular motion) with a fast wiggle on top (micromotion at the RF frequency). Both come out of the same equation.',
      why: 'A static field cannot hold a charge at rest in free space (Earnshaw’s theorem). An oscillating field can: the ion is pushed inward slightly more than outward each cycle, because it is a little further out when the push is inward. The net effect is a gentle bowl.',
    },
    {
      id: 'predict-v', kind: 'predict', title: 'More voltage',
      text: 'Turn the RF amplitude up to <b>900 V</b>. The ion will…',
      options: ['Be held more tightly', 'Shake harder and fly out', 'Nothing changes'],
      on: 'escape', afterLock: 'Turn it up and watch.',
      resolve: (guess, _c, d) => (d.q > 0.9 ? { correct: guess === 1, text: 'It flies out. Past q ≈ 0.91 the micromotion grows every cycle instead of averaging out: the “bowl” turns into a hill. The dot on the stability diagram crossed the edge of the green region.' } : null),
    },
    {
      id: 'lowfreq', kind: 'task', title: 'Catch it again, slower',
      text: 'Set the RF frequency to <b>12 MHz or lower</b>, then find a voltage that holds a new ion for <b>10 s</b>.',
      onEnter: () => { held = 0; bestHeld = 0; },
      check: () => ({ done: fRf <= 12.5e6 && bestHeld >= 10 && loaded, progress: fRf <= 12.5e6 ? Math.min(1, held / 10) : 0, hint: fRf > 12.5e6 ? 'Lower the frequency first.' : loaded && !motion.escaped ? `Held for ${held.toFixed(1)} s` : 'Load an ion.' }),
      doneText: 'Same q, different knobs.',
      doneDetail: 'q depends on voltage divided by frequency squared, so a slower field needs a lower voltage for the same stability. Real traps run at 10–50 MHz and a few hundred volts.',
    },
    {
      id: 'predict-dc', kind: 'predict', title: 'Squeeze the ends',
      text: 'Keep the RF low (q around 0.2) and raise the <b>endcap DC voltage</b> a lot. The ion will…',
      options: ['Be held tighter in every direction', 'Be squeezed along the axis but pushed out sideways', 'Nothing changes'],
      on: 'escape', afterLock: 'Lower the RF voltage, then turn up the DC.',
      resolve: (guess, _c, d) => (d.a < -0.005 ? { correct: guess === 1, text: 'A static voltage that confines along the trap axis must push outward in the other two directions; that is Earnshaw’s theorem again. The RF bowl has to be strong enough to beat it, which is why the green region narrows as a goes negative.' } : null),
    },
    {
      id: 'wrap', kind: 'info', title: 'A trap is a compromise',
      text: 'Higher q holds the ion tighter but adds micromotion and heating; too high and it is lost. Real traps sit at q ≈ 0.2–0.4 for exactly this reason. The Simulation tab of this lab shows the same idea as a ball on a spinning saddle.',
      button: 'Finish mission',
    },
  ];

  update();
  return {
    steps,
    frame(dt) {
      view.rfPhase += XI_RATE * dt;
      view.ovenFx = Math.max(0, view.ovenFx - dt * 1.5);
      if (loaded && !motion.escaped) {
        const { a, q } = params();
        motion.step(a, q, XI_RATE * dt, 6);
        view.ion = motion;
        view.trail.push([motion.x, motion.y]); if (view.trail.length > 240) view.trail.shift();
        held += dt; bestHeld = Math.max(bestHeld, held);
        roHeld.set(`${held.toFixed(1)} s`);
        if (motion.escaped) {
          view.escapeFx = { x: Math.max(-1.2, Math.min(1.2, motion.x)), y: Math.max(-1.2, Math.min(1.2, motion.y)), t: 0 };
          escapes++; lastEscapeQ = q; held = 0; view.trail = [];
          roHeld.set('lost'); ctx.announce('The ion flew out of the trap');
          store.log('escape', { experiment: meta.id, q, a });
          update();
          ctx.mission?.event('escape', { q, a });
        } else if (Math.floor(held * 2) !== Math.floor((held - dt) * 2)) ctx.mission?.poll();
      }
      if (view.escapeFx) { view.escapeFx.t += dt; if (view.escapeFx.t > 1) view.escapeFx = null; }
      view.draw();
    },
    dispose() { view.dispose(); stab.dispose(); },
  };
}
