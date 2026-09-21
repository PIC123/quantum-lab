// Tiny DOM helpers and the controls every experiment uses. No framework:
// the whole labs module has to run as static files next to the old site.

/**
 * Create an element. attrs may include class, text, html, dataset, style,
 * on{Event} handlers and aria-* attributes. Children can be nodes or strings.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

/** Format helpers. */
export const fmt = {
  us: (s, d = 2) => `${(s * 1e6).toFixed(d)} µs`,
  ms: (s, d = 2) => `${(s * 1e3).toFixed(d)} ms`,
  pct: (p, d = 1) => `${(p * 100).toFixed(d)} %`,
  khz: (radPerS, d = 1) => `${(radPerS / (2 * Math.PI) / 1e3).toFixed(d)} kHz`,
  mhz: (radPerS, d = 2) => `${(radPerS / (2 * Math.PI) / 1e6).toFixed(d)} MHz`,
  deg: (rad, d = 0) => `${((rad * 180) / Math.PI).toFixed(d)}°`,
  num: (x, d = 2) => Number(x).toFixed(d),
  temp: (K) => (K >= 1 ? `${K.toFixed(2)} K` : K >= 1e-3 ? `${(K * 1e3).toFixed(2)} mK` : `${(K * 1e6).toFixed(0)} µK`),
  pi: (theta) => { const f = theta / Math.PI; return Math.abs(f - Math.round(f)) < 1e-9 ? `${Math.round(f) === 1 ? '' : Math.round(f)}π` : `${f.toFixed(2)}π`; },
};

/**
 * A labelled range slider with a live value readout.
 * @returns {{el:HTMLElement, get:()=>number, set:(v:number)=>void, input:HTMLInputElement, setDisabled:(b:boolean)=>void, setRange:(min:number,max:number,step?:number)=>void}}
 */
export function slider({ id, label, min, max, step = 1, value, format = (v) => String(v), onInput, hint }) {
  const input = el('input', { type: 'range', min, max, step, value, id, 'aria-label': label });
  const out = el('output', { class: 'ctl-value', for: id, text: format(value) });
  const root = el('div', { class: 'ctl ctl-slider' },
    el('div', { class: 'ctl-head' }, el('label', { for: id, text: label }), out),
    input,
    el('div', { class: 'ctl-range' }, el('span', { text: format(Number(min)) }), hint ? el('span', { class: 'ctl-hint', text: hint }) : null, el('span', { text: format(Number(max)) })),
  );
  const get = () => Number(input.value);
  const refresh = () => { out.textContent = format(get()); };
  input.addEventListener('input', () => { refresh(); onInput?.(get()); });
  return {
    el: root, input, get,
    set(v) { input.value = String(v); refresh(); },
    setDisabled(b) { input.disabled = b; root.classList.toggle('is-disabled', b); },
    setRange(a, b, s) { input.min = String(a); input.max = String(b); if (s !== undefined) input.step = String(s); root.querySelector('.ctl-range span:first-child').textContent = format(a); root.querySelector('.ctl-range span:last-child').textContent = format(b); refresh(); },
    refresh,
  };
}

/** A button. */
export function button(label, onClick, { primary = false, cls = '', title } = {}) {
  const b = el('button', { type: 'button', class: `btn ${primary ? 'btn-primary' : ''} ${cls}`.trim(), text: label, title, onClick });
  return b;
}

/** A segmented control (radio group). */
export function segmented({ id, label, options, value, onChange }) {
  const root = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  const buttons = options.map((o) => {
    const b = el('button', { type: 'button', class: 'seg-btn', role: 'radio', 'aria-checked': String(o.value === value), dataset: { value: o.value }, text: o.label, title: o.title });
    b.addEventListener('click', () => { api.set(o.value); onChange?.(o.value); });
    return b;
  });
  root.append(...buttons);
  const api = {
    el: root,
    get: () => value,
    set(v) { value = v; buttons.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === String(v)))); },
  };
  return api;
}

/** A checkbox toggle. */
export function toggle({ id, label, checked = false, onChange }) {
  const input = el('input', { type: 'checkbox', id, checked: checked || undefined });
  input.addEventListener('change', () => onChange?.(input.checked));
  const root = el('label', { class: 'ctl ctl-toggle', for: id }, input, el('span', { class: 'toggle-track' }), el('span', { text: label }));
  return { el: root, get: () => input.checked, set(v) { input.checked = v; }, input };
}

/** A read-out row: label + value. */
export function readout(label, value = '', { cls = '' } = {}) {
  const val = el('span', { class: 'ro-value mono', text: value });
  const root = el('div', { class: `ro ${cls}`.trim() }, el('span', { class: 'ro-label', text: label }), val);
  return { el: root, set: (v) => { val.textContent = v; }, setClass: (c) => { root.className = `ro ${c}`; } };
}

/** Respect the user's reduced-motion preference. */
export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Ease in-out. */
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

/** A short success chime with WebAudio (only if sound is enabled). */
export function chime(enabled) {
  if (!enabled) return;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.5);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.12); o.stop(now + i * 0.12 + 0.55);
    });
  } catch { /* no audio available */ }
}

/** A soft click per detected photon. */
export function click(enabled, ac) {
  if (!enabled || !ac) return;
  try {
    const now = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 1800;
    g.gain.setValueAtTime(0.03, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    o.connect(g).connect(ac.destination); o.start(now); o.stop(now + 0.04);
  } catch { /* ignore */ }
}
