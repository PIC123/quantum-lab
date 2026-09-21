// The "Math" depth level: state vectors, matrices and the formula behind
// what the student is looking at. Rendered with plain Unicode and HTML so it
// needs no external maths library.

import { el, clear } from '../ui.js';

/** Format a complex number compactly. */
export function cfmt(re, im, d = 2) {
  const r = Math.abs(re) < 5e-3 ? 0 : re, i = Math.abs(im) < 5e-3 ? 0 : im;
  if (i === 0) return r.toFixed(d);
  if (r === 0) return `${i.toFixed(d)}i`;
  return `${r.toFixed(d)}${i < 0 ? '−' : '+'}${Math.abs(i).toFixed(d)}i`;
}

/** HTML table for a matrix {n, re, im}. */
export function matrixHtml(m, d = 2) {
  const dim = 1 << m.n;
  let rows = '';
  for (let r = 0; r < dim; r++) {
    rows += '<tr>';
    for (let c = 0; c < dim; c++) rows += `<td>${cfmt(m.re[r * dim + c], m.im[r * dim + c], d)}</td>`;
    rows += '</tr>';
  }
  return `<table class="matrix"><tbody>${rows}</tbody></table>`;
}

/** Column vector HTML for a QState. */
export function ketHtml(state, d = 2) {
  let rows = '';
  for (let i = 0; i < state.size; i++) rows += `<tr><td>${cfmt(state.re[i], state.im[i], d)}</td><td class="ket-label">|${i.toString(2).padStart(state.n, '0')}⟩</td></tr>`;
  return `<table class="matrix"><tbody>${rows}</tbody></table>`;
}

export class MathPanel {
  constructor(parent) {
    this.root = el('div', { class: 'math-panel' });
    parent.appendChild(this.root);
  }

  /** @param {Array<{title?:string, html:string}>} blocks */
  set(blocks) {
    const r = clear(this.root);
    for (const b of blocks) {
      if (b.title) r.append(el('div', { class: 'math-title', text: b.title }));
      r.append(el('div', { class: 'math-body', html: b.html }));
    }
  }
}
