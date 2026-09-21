// The physical lab view: trap electrodes, one or two ions, laser beams and
// fluorescence, drawn on a 2D canvas so it runs at 60 fps on a phone.
// Everything bright on screen is physics: ions glow when they scatter
// 397 nm light, beams light up while a pulse is on.

import { CanvasView, COLORS } from './canvas.js';
import { prefersReducedMotion } from '../ui.js';

/**
 * @typedef {Object} Ion
 * @property {number} x       position along the trap axis, −1..1
 * @property {number} glow    0..1 fluorescence brightness (bright state and detection on)
 * @property {number} [dx]    small displacement for motion animation (trap units)
 * @property {number} [dy]
 * @property {string} [label]
 */

/**
 * @typedef {Object} Beam
 * @property {string} id        '729' | '397' | '866' | custom
 * @property {number} on        0..1 intensity
 * @property {string} [label]
 * @property {number} [angle]   radians, direction the beam travels (0 = left→right)
 */

export class LabScene extends CanvasView {
  constructor(parent, opts = {}) {
    super(parent, { aspect: opts.aspect ?? 16 / 10, minHeight: 220, label: 'Lab view: an ion in a trap' });
    this.ions = [{ x: 0, glow: 0 }];
    this.beams = [];
    this.photons = [];
    this.flash = 0;
    this.caption = '';
    this.camera = { show: false, brightness: 0 };
    this.escapeFx = null;
    this.trail = [];
    this.showTrail = false;
    this.reduced = prefersReducedMotion();
    this.time = 0;
    this.extra = null; // optional custom drawing hook (ctx, geometry) => void
    this.init();
  }

  setIons(ions) { this.ions = ions; }
  setBeams(beams) { this.beams = beams; }
  setCaption(text) { this.caption = text; this.setLabel(text); }
  setCamera(show, brightness = 0) { this.camera = { show, brightness }; }

  /** Emit n photon sparks from ion i. */
  emit(i, n) {
    if (this.reduced) { this.flash = Math.min(1, this.flash + 0.2 * n); return; }
    const g = this.geometry();
    const p = g.ion(this.ions[i] || this.ions[0]);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const sp = 90 + Math.random() * 70;
      this.photons.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 });
    }
  }

  /** A little flash where the ion was, then it is gone. */
  escape(i) { const g = this.geometry(); const p = g.ion(this.ions[i] || this.ions[0]); this.escapeFx = { x: p.x, y: p.y, t: 0 }; }

  geometry() {
    const { w, h } = this;
    const cx = w / 2, cy = h * 0.52;
    const span = w * 0.28;
    return {
      cx, cy, span,
      ion: (ion) => ({ x: cx + ion.x * span + (ion.dx || 0) * span * 0.5, y: cy + (ion.dy || 0) * h * 0.18 }),
      electrodeGap: h * 0.16,
    };
  }

  /** Advance animations by dt seconds. */
  tick(dt) {
    this.time += dt;
    for (const p of this.photons) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.2; }
    this.photons = this.photons.filter((p) => p.life > 0);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.escapeFx) { this.escapeFx.t += dt; if (this.escapeFx.t > 1) this.escapeFx = null; }
    if (this.showTrail && this.ions[0]) {
      const p = this.geometry().ion(this.ions[0]);
      this.trail.push({ x: p.x, y: p.y });
      if (this.trail.length > 90) this.trail.shift();
    }
  }

  draw() {
    const { ctx, w, h } = this;
    const g = this.geometry();
    // background: dark lab at night
    const bg = ctx.createRadialGradient(g.cx, g.cy, 10, g.cx, g.cy, Math.max(w, h) * 0.8);
    bg.addColorStop(0, '#132038'); bg.addColorStop(1, '#070b14');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    // electrodes: two RF blades top and bottom, DC endcaps left and right
    const gap = g.electrodeGap;
    const bladeH = h * 0.09;
    const drawBlade = (y, flip) => {
      const grad = ctx.createLinearGradient(0, y, 0, y + bladeH);
      grad.addColorStop(flip ? 1 : 0, '#6b7280'); grad.addColorStop(flip ? 0 : 1, '#2b3341');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(w * 0.12, y, w * 0.76, bladeH, 6);
      ctx.fill();
    };
    drawBlade(g.cy - gap - bladeH, false);
    drawBlade(g.cy + gap, true);
    ctx.fillStyle = '#3b4453';
    ctx.beginPath(); ctx.roundRect(w * 0.06, g.cy - gap * 0.5, w * 0.08, gap, 4); ctx.fill();
    ctx.beginPath(); ctx.roundRect(w * 0.86, g.cy - gap * 0.5, w * 0.08, gap, 4); ctx.fill();
    ctx.fillStyle = COLORS.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RF', g.cx, g.cy - gap - bladeH - 6);
    ctx.fillText('RF', g.cx, g.cy + gap + bladeH + 14);

    // beams
    for (const b of this.beams) {
      if (b.on <= 0.001) continue;
      const color = b.color || (b.id === '729' ? COLORS.laser729 : b.id === '397' ? COLORS.laser397 : b.id === '866' ? COLORS.laser866 : COLORS.accent);
      const angle = b.angle ?? (b.id === '397' ? Math.PI / 6 : 0);
      const target = g.ion(this.ions[b.target ?? 0] || this.ions[0]);
      const len = Math.max(w, h) * 1.5;
      const x0 = target.x - Math.cos(angle) * len, y0 = target.y - Math.sin(angle) * len;
      const x1 = target.x + Math.cos(angle) * len, y1 = target.y + Math.sin(angle) * len;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.12 * b.on; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.5 * b.on; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 0.9 * b.on; ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.restore();
      if (b.label) {
        ctx.fillStyle = color; ctx.globalAlpha = 0.5 + 0.5 * b.on; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'left';
        const lx = Math.max(8, target.x - Math.cos(angle) * w * 0.42), ly = target.y - Math.sin(angle) * w * 0.42 - 8;
        ctx.fillText(b.label, lx, ly); ctx.globalAlpha = 1;
      }
    }

    // motion trail
    if (this.showTrail && this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(165,243,252,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
      this.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    }

    // ions
    this.ions.forEach((ion, i) => {
      if (ion.hidden) return;
      const p = g.ion(ion);
      const glow = Math.max(0, Math.min(1, ion.glow + this.flash * 0.5));
      const r = Math.max(5, Math.min(w, h) * 0.02);
      if (glow > 0.01) {
        const R = r * (4 + 6 * glow);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        gr.addColorStop(0, `rgba(190,240,255,${0.9 * glow})`);
        gr.addColorStop(0.3, `rgba(120,200,255,${0.35 * glow})`);
        gr.addColorStop(1, 'rgba(60,120,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = glow > 0.3 ? '#f0fbff' : '#5b6b85';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      if (ion.label) { ctx.fillStyle = COLORS.text; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(ion.label, p.x, p.y + r + 16); }
    });

    // photon sparks
    if (this.photons.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of this.photons) { ctx.fillStyle = `rgba(200,240,255,${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }

    // escape flash
    if (this.escapeFx) {
      const t = this.escapeFx.t;
      ctx.strokeStyle = `rgba(251,191,36,${1 - t})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.escapeFx.x, this.escapeFx.y, 10 + t * 60, 0, Math.PI * 2); ctx.stroke();
    }

    // camera (fluorescence image) inset
    if (this.camera.show) {
      const cw = Math.min(110, w * 0.22), ch = cw * 0.8;
      const x = w - cw - 10, y = 10;
      ctx.fillStyle = '#05080f'; ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 6); ctx.fill(); ctx.stroke();
      const b = this.camera.brightness;
      if (b > 0.02) {
        const gr = ctx.createRadialGradient(x + cw / 2, y + ch / 2, 0, x + cw / 2, y + ch / 2, cw * 0.28);
        gr.addColorStop(0, `rgba(230,250,255,${b})`); gr.addColorStop(0.5, `rgba(120,200,255,${0.5 * b})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, cw * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      // sensor noise
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      for (let k = 0; k < 12; k++) ctx.fillRect(x + 2 + ((k * 37 + this.time * 60) % (cw - 4)), y + 2 + ((k * 53) % (ch - 4)), 1.5, 1.5);
      ctx.fillStyle = COLORS.muted; ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('camera', x + cw / 2, y + ch + 12);
    }

    this.extra?.(ctx, g, this);

    if (this.caption) {
      ctx.fillStyle = COLORS.text; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(this.caption, 12, h - 12);
    }
  }
}
