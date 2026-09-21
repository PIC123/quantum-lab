// Shared canvas plumbing: device-pixel-ratio scaling and resize handling.

export class CanvasView {
  /** @param {HTMLElement} parent @param {{aspect?:number, minHeight?:number, label?:string}} opts */
  constructor(parent, { aspect = null, minHeight = 160, label = '' } = {}) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'view-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', label);
    this.ctx = this.canvas.getContext('2d');
    this.parent = parent;
    this.aspect = aspect;
    this.minHeight = minHeight;
    parent.appendChild(this.canvas);
    this.w = 0; this.h = 0;
    this.ready = false;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(parent);
  }

  /** Subclasses call this at the end of their constructor. */
  init() { this.ready = true; this.resize(); this.draw?.(); }

  setLabel(text) { this.canvas.setAttribute('aria-label', text); }

  resize() {
    const rect = this.parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = this.aspect ? Math.max(this.minHeight, Math.floor(w / this.aspect)) : Math.max(this.minHeight, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && this.dpr === dpr) return;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.ready) this.draw?.();
  }

  dispose() { this.ro.disconnect(); this.canvas.remove(); }
}

/** Colours shared by all views (kept in sync with labs.css). */
export const COLORS = {
  bg: '#0b1220',
  panel: '#111a2e',
  grid: 'rgba(148,163,184,0.18)',
  text: '#cbd5e1',
  muted: '#7c8aa5',
  accent: '#38bdf8',
  accent2: '#f472b6',
  success: '#4ade80',
  warn: '#fbbf24',
  ion: '#a5f3fc',
  laser729: '#ff3b5c',
  laser397: '#8b5cf6',
  laser866: '#b91c1c',
  series: ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#c084fc', '#fb923c'],
};
