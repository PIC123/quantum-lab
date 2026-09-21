// The experiment runner: builds the page layout, creates the experiment,
// wires the mission panel, depth control, mobile tabs and the animation loop.

import { el, clear, segmented, prefersReducedMotion, easeInOut } from './ui.js';
import { Mission } from './mission.js';
import { MissionPanel } from './views/mission-panel.js';
import { Rng } from '../core/rng.js';
import { DEFAULT_RABI } from '../core/pulses.js';

const DEPTHS = [
  { value: 'explore', label: 'Explore', title: 'Visuals only' },
  { value: 'understand', label: 'Understand', title: 'Bloch sphere and probabilities' },
  { value: 'math', label: 'Math', title: 'State vectors, matrices, equations' },
];

/** Hidden machine parameters, drawn once per student. */
export function makeMachine(rng) {
  return {
    rabi: 2 * Math.PI * (80e3 + 40e3 * rng.next()),   // qubit Rabi frequency, 80–120 kHz
    detuningOffset: 2 * Math.PI * (-3e3 + 6e3 * rng.next()), // small unknown qubit frequency offset
    msRate: 2 * Math.PI * (8e3 + 4e3 * rng.next()),   // MS gate: θ = msRate · t
  };
}

export class Runner {
  /** @param {HTMLElement} root @param {{store:import('./store.js').Store, catalog:Array}} deps */
  constructor(root, { store, catalog }) {
    this.root = root;
    this.store = store;
    this.catalog = catalog;
    this.current = null;
  }

  async open(id) {
    this.close();
    const entry = this.catalog.find((e) => e.id === id);
    if (!entry || !entry.load) { this.root.append(el('p', { class: 'empty', text: 'This experiment is not available yet.' })); return; }
    let mod;
    try { mod = await entry.load(); } catch (err) { console.error(err); this.root.append(el('p', { class: 'empty', text: 'This experiment is not built yet.' }), el('a', { class: 'btn', href: '#/', text: '← Experiments' })); return; }
    const { meta } = mod;
    const store = this.store;
    const rng = new Rng();
    const machine = store.machine(() => makeMachine(rng));
    const depth = store.settings.depth || 'explore';

    // ---- layout ----
    const labEl = el('div', { class: 'x-lab card' });
    const controlsEl = el('div', { class: 'x-controls card' });
    const sideEl = el('section', { class: 'x-side', dataset: { tab: 'data' } });
    const missionEl = el('div', { class: 'x-mission card' });
    const live = el('div', { class: 'sr-only', 'aria-live': 'polite' });
    const toast = el('div', { class: 'toast', hidden: true });
    const depthSeg = segmented({ id: 'depth', label: 'Depth level', options: DEPTHS, value: depth, onChange: (v) => { page.dataset.depth = v; store.setSetting('depth', v); } });
    const page = el('div', { class: 'x', dataset: { depth, activeTab: 'lab' } },
      el('header', { class: 'x-header' },
        el('a', { class: 'x-back', href: '#/', text: '← Experiments' }),
        el('div', { class: 'x-title' }, el('span', { class: 'x-num', text: meta.number }), el('h2', { text: meta.title }), el('span', { class: 'x-concept', text: meta.concept })),
        el('div', { class: 'x-depth' }, depthSeg.el)),
      el('div', { class: 'x-body' },
        el('section', { class: 'x-lab-col', dataset: { tab: 'lab' } }, labEl, controlsEl),
        sideEl,
        el('aside', { class: 'x-mission-col', dataset: { tab: 'mission' } }, missionEl)),
      el('nav', { class: 'x-tabs', 'aria-label': 'Views' },
        ...[['lab', 'Lab'], ['data', 'Data'], ['mission', 'Mission']].map(([k, label]) =>
          el('button', { type: 'button', class: 'x-tab', dataset: { tab: k }, 'aria-pressed': String(k === 'lab'), text: label, onClick: () => {
            page.dataset.activeTab = k;
            page.querySelectorAll('.x-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === k)));
            window.dispatchEvent(new Event('resize'));
          } }))),
      live, toast);
    this.root.append(page);

    // ---- context handed to the experiment ----
    const animations = new Set();
    const ctx = {
      meta, store, rng, machine, page,
      lab: labEl, controls: controlsEl,
      get calibration() { return store.calibration; },
      get depth() { return page.dataset.depth; },
      reducedMotion: prefersReducedMotion(),
      mission: null,
      /** Add a card to the side column; returns its body element. */
      card(title, { depth: d = 'explore', cls = '', help } = {}) {
        const body = el('div', { class: 'card-body' });
        const card = el('div', { class: `card depth-${d} ${cls}`.trim() }, el('div', { class: 'card-head' }, el('h3', { text: title }), help ? el('span', { class: 'card-help', text: help }) : null), body);
        sideEl.append(card);
        return body;
      },
      /** Screen-reader announcement. */
      announce(text) { live.textContent = ''; setTimeout(() => { live.textContent = text; }, 30); },
      /** Short on-screen message. */
      notify(text, ms = 2200) { toast.textContent = text; toast.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { toast.hidden = true; }, ms); },
      /** Time-based animation; resolves when done. Skips to the end under reduced motion. */
      animate({ duration, onFrame, ease = easeInOut }) {
        return new Promise((resolve) => {
          if (ctx.reducedMotion || duration <= 0) { onFrame(1); resolve(); return; }
          const a = { start: performance.now(), duration, onFrame, ease, resolve };
          animations.add(a);
        });
      },
      sound: () => store.settings.sound,
    };

    const exp = mod.create(ctx);
    const mission = new Mission({ id: meta.id, steps: exp.steps, store, ctx });
    ctx.mission = mission;
    const nextEntry = this.catalog.find((e) => e.number === meta.number + 1 && e.load);
    const panel = new MissionPanel(missionEl, mission, { next: nextEntry, sound: store.settings.sound });
    mission.start();
    exp.ready?.();

    // ---- animation loop ----
    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden) return;
      for (const a of animations) {
        const t = Math.min(1, (now - a.start) / a.duration);
        a.onFrame(a.ease(t), t);
        if (t >= 1) { animations.delete(a); a.resolve(); }
      }
      exp.frame?.(dt);
    };
    raf = requestAnimationFrame(loop);

    this.current = { dispose() { cancelAnimationFrame(raf); animations.clear(); exp.dispose?.(); panel.dispose(); page.remove(); } };
  }

  close() { this.current?.dispose(); this.current = null; clear(this.root); }
}

export { DEFAULT_RABI };
