// The circuit view: an SVG drawing of the pulse sequence as gates. It is
// generated from the same pulse list the lab view animates, so the two can
// never disagree. Gates can be clickable when the experiment allows editing.

import { el } from '../ui.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...children) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, String(v));
  for (const c of children) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
};

/**
 * @typedef {Object} Gate
 * @property {number|number[]} q   qubit index or [a, b] for two-qubit gates
 * @property {string} label        text in the box, e.g. 'Rx(π)'
 * @property {string} [sub]        small text under the label, e.g. '5.0 µs'
 * @property {'pulse'|'vz'|'ms'|'measure'|'wait'|'barrier'} [kind]
 * @property {boolean} [active]    highlighted (during playback)
 * @property {boolean} [dim]       greyed out
 * @property {*} [ref]             passed back to onGateClick
 */

export class CircuitView {
  /** @param {HTMLElement} parent */
  constructor(parent, { qubits = 1, labels = null, editable = false, scroll = false } = {}) {
    this.parent = parent;
    this.scroll = scroll;
    if (scroll) parent.style.overflowX = 'auto';
    this.qubits = qubits;
    this.labels = labels;
    this.editable = editable;
    this.columns = [];
    this.onGateClick = null;
    this.onAdd = null;
    this.svg = svg('svg', { class: 'circuit-svg', role: 'img', 'aria-label': 'Quantum circuit' });
    parent.appendChild(this.svg);
    this.wrap = parent;
  }

  /** @param {Gate[][]} columns each column is a list of gates in that time slot */
  setCircuit(columns, { qubits, labels } = {}) {
    if (qubits) this.qubits = qubits;
    if (labels) this.labels = labels;
    this.columns = columns;
    this.draw();
  }

  draw() {
    const s = this.svg;
    while (s.firstChild) s.removeChild(s.firstChild);
    const rowH = 54, colW = 64, left = 46, top = 18;
    const cols = this.columns.length + (this.editable ? 1 : 0);
    const width = left + Math.max(2, cols) * colW + 40;
    const height = top + this.qubits * rowH;
    s.setAttribute('viewBox', `0 0 ${width} ${height}`);
    s.setAttribute('width', this.scroll && cols > 6 ? String(width) : '100%');
    s.style.maxWidth = this.scroll ? 'none' : `${width}px`;
    const y = (q) => top + q * rowH + rowH / 2 - 6;
    // wires and labels
    for (let q = 0; q < this.qubits; q++) {
      s.append(svg('line', { x1: left - 8, y1: y(q), x2: width - 20, y2: y(q), class: 'cq-wire' }));
      s.append(svg('text', { x: 8, y: y(q) + 4, class: 'cq-label' }, this.labels?.[q] ?? `q${q}`));
    }
    // gates
    this.columns.forEach((col, ci) => {
      const x = left + ci * colW + colW / 2;
      for (const g of col) {
        const kind = g.kind || 'pulse';
        const qs = Array.isArray(g.q) ? g.q : [g.q];
        const cls = `cq-gate cq-${kind}${g.active ? ' is-active' : ''}${g.dim ? ' is-dim' : ''}${this.editable && g.ref !== undefined ? ' is-clickable' : ''}`;
        const group = svg('g', { class: cls, tabindex: this.editable && g.ref !== undefined ? 0 : null, role: this.editable ? 'button' : null });
        if (kind === 'wait') {
          const yy = y(qs[0]);
          group.append(svg('line', { x1: x - 22, y1: yy, x2: x + 22, y2: yy, class: 'cq-waitline' }));
          group.append(svg('text', { x, y: yy - 10, class: 'cq-text' }, g.label));
          if (g.sub) group.append(svg('text', { x, y: yy + 18, class: 'cq-sub' }, g.sub));
        } else if (kind === 'measure') {
          const yy = y(qs[0]);
          group.append(svg('rect', { x: x - 20, y: yy - 18, width: 40, height: 36, rx: 6 }));
          group.append(svg('path', { d: `M ${x - 11} ${yy + 8} A 11 11 0 0 1 ${x + 11} ${yy + 8}`, class: 'cq-meter' }));
          group.append(svg('line', { x1: x, y1: yy + 8, x2: x + 8, y2: yy - 4, class: 'cq-meter' }));
        } else if (kind === 'cnot') {
          const [c, t] = qs;
          group.append(svg('line', { x1: x, y1: y(c), x2: x, y2: y(t), class: 'cq-wire' }));
          group.append(svg('circle', { cx: x, cy: y(c), r: 5, class: 'cq-dot' }));
          group.append(svg('circle', { cx: x, cy: y(t), r: 11, class: 'cq-plus' }));
          group.append(svg('line', { x1: x - 11, y1: y(t), x2: x + 11, y2: y(t), class: 'cq-plusline' }));
          group.append(svg('line', { x1: x, y1: y(t) - 11, x2: x, y2: y(t) + 11, class: 'cq-plusline' }));
        } else if (kind === 'ms' || qs.length === 2) {
          const y0 = Math.min(...qs.map(y)) - 18, y1 = Math.max(...qs.map(y)) + 18;
          group.append(svg('rect', { x: x - 24, y: y0, width: 48, height: y1 - y0, rx: 8 }));
          group.append(svg('text', { x, y: (y0 + y1) / 2 + 4, class: 'cq-text' }, g.label));
          if (g.sub) group.append(svg('text', { x, y: y1 - 6, class: 'cq-sub' }, g.sub));
        } else {
          const yy = y(qs[0]);
          group.append(svg('rect', { x: x - 24, y: yy - 18, width: 48, height: 36, rx: 6 }));
          group.append(svg('text', { x, y: yy + (g.sub ? 1 : 4), class: 'cq-text' }, g.label));
          if (g.sub) group.append(svg('text', { x, y: yy + 14, class: 'cq-sub' }, g.sub));
        }
        if (this.editable && g.ref !== undefined && this.onGateClick) {
          group.addEventListener('click', () => this.onGateClick(g.ref, g));
          group.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onGateClick(g.ref, g); } });
        }
        s.append(group);
      }
    });
    if (this.editable && this.onAdd) {
      const x = left + this.columns.length * colW + colW / 2, yy = y(0);
      const g = svg('g', { class: 'cq-gate cq-add is-clickable', tabindex: 0, role: 'button', 'aria-label': 'Add a pulse' });
      g.append(svg('rect', { x: x - 20, y: yy - 16, width: 40, height: 32, rx: 6 }));
      g.append(svg('text', { x, y: yy + 5, class: 'cq-text' }, '+'));
      g.addEventListener('click', () => this.onAdd());
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onAdd(); } });
      s.append(g);
    }
  }
}

export { el };
