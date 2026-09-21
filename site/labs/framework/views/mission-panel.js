// The mission panel: shows the current step, the predict prompt, the
// "Why?" disclosure and a progress bar. Purely a renderer of Mission state.

import { el, clear, button, slider, chime } from '../ui.js';

export class MissionPanel {
  /**
   * @param {HTMLElement} parent
   * @param {import('../mission.js').Mission} mission
   * @param {{next?: {id:string,title:string}, sound?: boolean, onRestart?: ()=>void}} opts
   */
  constructor(parent, mission, opts = {}) {
    this.mission = mission;
    this.opts = opts;
    this.root = el('div', { class: 'mission', 'aria-live': 'polite' });
    parent.appendChild(this.root);
    this.unsub = mission.onChange(() => this.render());
    this.lastCompleted = mission.completed;
    this.render();
  }

  render() {
    const m = this.mission;
    const r = clear(this.root);
    const done = m.completed;
    if (done && !this.lastCompleted) { chime(this.opts.sound); this.lastCompleted = true; }
    const bar = el('div', { class: 'mission-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': m.total, 'aria-valuenow': Math.min(m.index, m.total) },
      el('div', { class: 'mission-progress-fill', style: { width: `${(Math.min(m.index, m.total) / m.total) * 100}%` } }));
    const head = el('div', { class: 'mission-head' },
      el('span', { class: 'mission-kicker', text: done ? 'Mission complete' : `Step ${m.index + 1} of ${m.total}` }),
      bar);
    r.append(head);

    if (done) {
      r.append(el('h3', { class: 'mission-title', text: 'Free play unlocked' }),
        el('p', { class: 'mission-text', html: 'Every control is yours now. Try to break it, then explain what you see.' }));
      const row = el('div', { class: 'mission-actions' });
      if (this.opts.next) row.append(el('a', { class: 'btn btn-primary', href: `#/exp/${this.opts.next.id}`, text: `Next: ${this.opts.next.title} →` }));
      row.append(button('Replay mission', () => m.restart()));
      r.append(row);
      return;
    }

    const s = m.step;
    r.append(el('h3', { class: 'mission-title', text: s.title }));
    r.append(el('p', { class: 'mission-text', html: typeof s.text === 'function' ? s.text(m.ctx) : s.text }));

    if (s.kind === 'info') {
      r.append(el('div', { class: 'mission-actions' }, button(s.button || 'Got it', () => m.next(), { primary: true })));
    } else if (s.kind === 'predict') {
      if (!m.locked) {
        r.append(el('p', { class: 'mission-predict-label', text: 'Your prediction:' }));
        if (s.options) {
          const opts = el('div', { class: 'mission-options', role: 'group', 'aria-label': 'Prediction options' });
          s.options.forEach((o, i) => opts.append(button(o, () => m.predict(i, o), { cls: 'btn-option' })));
          r.append(opts);
        } else if (s.slider) {
          const sl = slider({ id: `predict-${s.id}`, label: s.slider.label, min: s.slider.min, max: s.slider.max, step: s.slider.step, value: s.slider.value, format: s.slider.format });
          r.append(sl.el, el('div', { class: 'mission-actions' }, button('Lock in my prediction', () => m.predict(sl.get(), sl.get()), { primary: true })));
        }
      } else if (!m.feedback) {
        r.append(el('p', { class: 'mission-locked', html: `Locked in: <b>${m.locked.label}</b>. ${s.afterLock || 'Now run it and see.'}` }));
      } else {
        r.append(el('div', { class: `mission-feedback ${m.feedback.correct ? 'is-correct' : 'is-wrong'}` },
          el('div', { class: 'mission-feedback-head', text: m.feedback.correct ? 'You called it.' : 'Not quite, and that is the interesting part.' }),
          el('div', { html: `You predicted <b>${m.locked.label}</b>. ${m.feedback.text}` })));
        r.append(el('div', { class: 'mission-actions' }, button('Continue', () => m.next(), { primary: true })));
      }
    } else if (s.kind === 'task') {
      if (m.progress !== null && m.progress !== undefined && !m.taskDone) {
        r.append(el('div', { class: 'task-progress' }, el('div', { class: 'task-progress-fill', style: { width: `${Math.round(m.progress * 100)}%` } })));
      }
      if (m.hint && !m.taskDone) r.append(el('p', { class: 'mission-hint', html: m.hint }));
      if (m.taskDone) {
        r.append(el('div', { class: 'mission-feedback is-correct' }, el('div', { class: 'mission-feedback-head', text: s.doneText || 'Done.' }), s.doneDetail ? el('div', { html: typeof s.doneDetail === 'function' ? s.doneDetail(m.ctx) : s.doneDetail }) : null));
        r.append(el('div', { class: 'mission-actions' }, button('Continue', () => m.next(), { primary: true })));
      }
    }

    if (s.why) {
      const body = el('div', { class: 'why-body', html: s.why, hidden: true });
      const btn = button('Why?', () => { body.hidden = !body.hidden; btn.setAttribute('aria-expanded', String(!body.hidden)); }, { cls: 'btn-why' });
      btn.setAttribute('aria-expanded', 'false');
      r.append(el('div', { class: 'why' }, btn, body));
    }
  }

  dispose() { this.unsub(); this.root.remove(); }
}
