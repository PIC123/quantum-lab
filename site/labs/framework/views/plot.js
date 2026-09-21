// A small chart component on canvas: line, scatter and bar series with
// axes, ticks, legend, reference lines and markers.

import { CanvasView, COLORS } from './canvas.js';

export class Plot extends CanvasView {
  constructor(parent, opts = {}) {
    super(parent, { aspect: opts.aspect ?? 1.7, minHeight: opts.minHeight ?? 170, label: opts.label ?? 'Plot' });
    this.data = { series: [], xLabel: '', yLabel: '', xRange: null, yRange: null, hlines: [], vlines: [], legend: true, xTicks: null };
    this.init();
  }

  setData(d) { this.data = { ...this.data, ...d }; this.draw(); }

  draw() {
    const { ctx, w, h } = this;
    const d = this.data;
    ctx.clearRect(0, 0, w, h);
    const hasLegend = d.legend !== false && d.series.some((s) => s.name);
    const padL = 44, padR = 12, padT = hasLegend ? 24 : 12, padB = 34;
    const pw = w - padL - padR, ph = h - padT - padB;
    // ranges
    let [xmin, xmax] = d.xRange || [Infinity, -Infinity];
    let [ymin, ymax] = d.yRange || [Infinity, -Infinity];
    if (!d.xRange || !d.yRange) {
      for (const s of d.series) for (const [x, y] of s.points) {
        if (!d.xRange) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); }
        if (!d.yRange) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
      }
      if (!Number.isFinite(xmin)) { xmin = 0; xmax = 1; }
      if (!Number.isFinite(ymin)) { ymin = 0; ymax = 1; }
      if (xmin === xmax) xmax = xmin + 1;
      if (ymin === ymax) ymax = ymin + 1;
      if (!d.yRange) { const m = (ymax - ymin) * 0.08; ymin -= m; ymax += m; }
    }
    const X = (x) => padL + ((x - xmin) / (xmax - xmin)) * pw;
    const Y = (y) => padT + ph - ((y - ymin) / (ymax - ymin)) * ph;

    // grid and ticks
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = COLORS.muted; ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    const ticks = (min, max, n) => { const step = niceStep((max - min) / n); const out = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v); return out; };
    if (d.xTicks) {
      for (const t of d.xTicks) { ctx.textAlign = 'center'; ctx.fillText(t.label, X(t.x), padT + ph + 14); }
    } else {
      for (const t of ticks(xmin, xmax, 5)) {
        ctx.beginPath(); ctx.moveTo(X(t), padT); ctx.lineTo(X(t), padT + ph); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillText(fmtTick(t), X(t), padT + ph + 14);
      }
    }
    for (const t of ticks(ymin, ymax, 4)) {
      ctx.beginPath(); ctx.moveTo(padL, Y(t)); ctx.lineTo(padL + pw, Y(t)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(fmtTick(t), padL - 6, Y(t) + 4);
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.strokeRect(padL, padT, pw, ph);
    ctx.fillStyle = COLORS.text; ctx.textAlign = 'center';
    if (d.xLabel) ctx.fillText(d.xLabel, padL + pw / 2, h - 6);
    if (d.yLabel) { ctx.save(); ctx.translate(10, padT + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(d.yLabel, 0, 0); ctx.restore(); }

    // reference lines
    for (const l of d.hlines || []) {
      ctx.strokeStyle = l.color || COLORS.warn; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(padL, Y(l.y)); ctx.lineTo(padL + pw, Y(l.y)); ctx.stroke(); ctx.setLineDash([]);
      if (l.label) { ctx.fillStyle = l.color || COLORS.warn; ctx.textAlign = 'right'; ctx.fillText(l.label, padL + pw - 4, Y(l.y) - 4); }
    }
    for (const l of d.vlines || []) {
      ctx.strokeStyle = l.color || COLORS.warn; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(l.x), padT); ctx.lineTo(X(l.x), padT + ph); ctx.stroke(); ctx.setLineDash([]);
      if (l.label) { ctx.fillStyle = l.color || COLORS.warn; ctx.textAlign = 'left'; ctx.fillText(l.label, X(l.x) + 4, padT + 12); }
    }

    // series
    ctx.save(); ctx.beginPath(); ctx.rect(padL, padT, pw, ph); ctx.clip();
    d.series.forEach((s, i) => {
      const color = s.color || COLORS.series[i % COLORS.series.length];
      if (s.kind === 'bars') {
        const bw = s.barWidth ?? (pw / Math.max(1, s.points.length)) * 0.8;
        ctx.fillStyle = color; ctx.globalAlpha = s.alpha ?? 0.85;
        for (const [x, y] of s.points) { const x0 = X(x) - bw / 2; ctx.fillRect(x0, Y(y), bw, Y(ymin) - Y(y)); }
        ctx.globalAlpha = 1;
      } else if (s.kind === 'scatter') {
        ctx.fillStyle = color; ctx.strokeStyle = color;
        for (const [x, y, err] of s.points) {
          if (err) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x), Y(y - err)); ctx.lineTo(X(x), Y(y + err)); ctx.stroke(); }
          ctx.beginPath(); ctx.arc(X(x), Y(y), s.radius ?? 3.5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.strokeStyle = color; ctx.lineWidth = s.width ?? 2; if (s.dash) ctx.setLineDash(s.dash);
        ctx.beginPath(); s.points.forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.stroke(); ctx.setLineDash([]);
      }
    });
    ctx.restore();

    // legend
    if (hasLegend) {
      let lx = padL, ly = 12;
      d.series.filter((s) => s.name).forEach((s, i) => {
        const color = s.color || COLORS.series[d.series.indexOf(s) % COLORS.series.length];
        ctx.fillStyle = color; ctx.fillRect(lx, ly - 8, 10, 10);
        ctx.fillStyle = COLORS.text; ctx.textAlign = 'left'; ctx.fillText(s.name, lx + 14, ly);
        lx += 14 + ctx.measureText(s.name).width + 14;

      });
    }
  }
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const r = raw / p;
  return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * p;
}
function fmtTick(v) { return Math.abs(v) >= 1000 ? v.toExponential(0) : Number(v.toFixed(6)).toString(); }
