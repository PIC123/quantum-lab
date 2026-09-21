// A Bloch sphere on a 2D canvas: orthographic projection of a tilted sphere,
// the state vector as an arrow, optional rotation axis and trail.

import { CanvasView, COLORS } from './canvas.js';

const TILT = -1.05;   // rotate about x (radians) so we look slightly from above
const TURN = 0.55;    // rotate about z so x and y axes are both visible

function project([x, y, z]) {
  // rotate about z by TURN
  const x1 = x * Math.cos(TURN) - y * Math.sin(TURN);
  const y1 = x * Math.sin(TURN) + y * Math.cos(TURN);
  // rotate about x by TILT: screen up is +z
  const y2 = y1 * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y1 * Math.sin(TILT) + z * Math.cos(TILT);
  return { sx: x1, sy: -z2, depth: y2 };
}

export class BlochSphere extends CanvasView {
  constructor(parent) {
    super(parent, { aspect: 1.15, minHeight: 200, label: 'Bloch sphere showing the qubit state' });
    this.vector = [0, 0, 1];
    this.axis = null;
    this.trail = [];
    this.secondary = null; // optional second vector (e.g. ideal vs actual)
    this.init();
  }

  setVector(v) { this.vector = v; }
  setAxis(a) { this.axis = a; }
  setSecondary(v) { this.secondary = v; }
  pushTrail() { this.trail.push([...this.vector]); if (this.trail.length > 200) this.trail.shift(); }
  clearTrail() { this.trail = []; }

  draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) * 0.38;
    const P = (v) => { const p = project(v); return { x: cx + p.sx * R, y: cy + p.sy * R, d: p.depth }; };

    // sphere body
    const body = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    body.addColorStop(0, 'rgba(56,189,248,0.16)'); body.addColorStop(1, 'rgba(56,189,248,0.03)');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.55)'; ctx.lineWidth = 1; ctx.stroke();

    // circles: equator and two meridians
    const circle = (fn, style) => {
      ctx.strokeStyle = style; ctx.beginPath();
      for (let i = 0; i <= 72; i++) { const t = (i / 72) * Math.PI * 2; const p = P(fn(t)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke();
    };
    circle((t) => [Math.cos(t), Math.sin(t), 0], 'rgba(148,163,184,0.45)');
    circle((t) => [Math.cos(t), 0, Math.sin(t)], 'rgba(148,163,184,0.2)');
    circle((t) => [0, Math.cos(t), Math.sin(t)], 'rgba(148,163,184,0.2)');

    // axes
    const axis = (v, label, color) => {
      const a = P(v.map((c) => -c)), b = P(v);
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      const l = P(v.map((c) => c * 1.18));
      ctx.fillStyle = color; ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, l.x, l.y);
    };
    axis([1, 0, 0], 'x', COLORS.muted);
    axis([0, 1, 0], 'y', COLORS.muted);
    ctx.fillStyle = COLORS.text; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const top = P([0, 0, 1.22]), bot = P([0, 0, -1.22]);
    ctx.fillText('|0⟩', top.x, top.y); ctx.fillText('|1⟩', bot.x, bot.y);
    ctx.strokeStyle = COLORS.muted; ctx.setLineDash([3, 4]); ctx.beginPath();
    const z0 = P([0, 0, -1]), z1 = P([0, 0, 1]); ctx.moveTo(z0.x, z0.y); ctx.lineTo(z1.x, z1.y); ctx.stroke(); ctx.setLineDash([]);

    // rotation axis
    if (this.axis) {
      const a = P(this.axis.map((c) => -c * 1.1)), b = P(this.axis.map((c) => c * 1.1));
      ctx.strokeStyle = COLORS.laser729; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    }

    // trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(244,114,182,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
      this.trail.forEach((v, i) => { const p = P(v); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.stroke();
    }

    // secondary (ghost) vector
    if (this.secondary) this.#arrow(P, this.secondary, 'rgba(148,163,184,0.7)', 1.5);
    // state vector
    this.#arrow(P, this.vector, COLORS.accent2, 3);
    const len = Math.hypot(...this.vector);
    if (len < 0.98) {
      ctx.fillStyle = COLORS.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`|r| = ${len.toFixed(2)} (mixed: entangled with the other ion)`, 8, h - 8);
    }
  }

  #arrow(P, v, color, width) {
    const { ctx } = this;
    const o = P([0, 0, 0]), t = P(v);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x, t.y, width + 2, 0, Math.PI * 2); ctx.fill();
  }
}
