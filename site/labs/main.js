// Entry point: hash router with the home page (experiment picker), the
// experiment runner and the lab notebook.

import { el, clear, button, toggle, fmt } from './framework/ui.js';
import { Store } from './framework/store.js';
import { Runner } from './framework/runner.js';
import { catalog } from './experiments/index.js';

const store = new Store();
const app = document.getElementById('app');
const runner = new Runner(el('div'), { store, catalog });

function route() {
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/exp\/([\w-]+)/);
  runner.close();
  clear(app);
  if (m) { app.append(runner.root); runner.open(m[1]); window.scrollTo(0, 0); return; }
  if (hash.startsWith('#/notebook')) { app.append(notebook()); window.scrollTo(0, 0); return; }
  app.append(home());
}

function topbar() {
  return el('div', { class: 'topbar' },
    el('a', { class: 'topbar-brand', href: '../' }, el('img', { src: '../images/nc_tiqp_logo.jpg', alt: '' }), el('span', { text: 'TIQC Lab' }), el('span', { class: 'topbar-sub', text: 'v-Labs' })),
    el('nav', { class: 'topbar-nav', 'aria-label': 'Site' }, el('a', { href: '../#apparatus', text: 'Apparatus' }), el('a', { href: '../#how', text: 'How it works' }), el('a', { href: '../', text: 'Site home' })));
}

function statusOf(entry) {
  const p = store.progress(entry.id);
  if (!entry.load) return { label: 'Coming soon', cls: 'is-soon' };
  if (p.completed) return { label: 'Completed', cls: 'is-done' };
  if (p.started) return { label: 'In progress', cls: 'is-active' };
  return { label: 'Not started', cls: '' };
}

function home() {
  const cal = store.calibration;
  const cards = catalog.map((e) => {
    const s = statusOf(e);
    const inner = [
      el('div', { class: 'exp-num', text: e.number }),
      el('div', { class: 'exp-main' },
        el('h3', { class: 'exp-title', text: e.title }),
        el('div', { class: 'exp-concept', text: e.concept }),
        el('div', { class: 'exp-mission' }, el('span', { class: 'exp-mission-label', text: 'Mission' }), ` ${e.mission}`)),
      el('div', { class: `exp-status ${s.cls}`, text: s.label }),
    ];
    return e.load
      ? el('a', { class: 'exp-card', href: `#/exp/${e.id}`, 'aria-label': `${e.number}. ${e.title}: ${s.label}` }, ...inner)
      : el('div', { class: 'exp-card is-soon', 'aria-disabled': 'true' }, ...inner);
  });
  const sound = toggle({ id: 'sound', label: 'Sound', checked: store.settings.sound, onChange: (v) => store.setSetting('sound', v) });
  const done = catalog.filter((e) => store.progress(e.id).completed).length;
  return el('div', { class: 'home' },
    topbar(),
    el('header', { class: 'home-head' },
      el('div', null,
        el('h1', { text: 'Guided experiments' }),
        el('p', { class: 'home-sub', text: 'Eight missions that teach quantum computing through the hardware of a trapped-ion machine. Start anywhere; the order below builds skills step by step.' })),
      el('div', { class: 'home-side' },
        el('div', { class: 'home-stat' }, el('b', { text: `${done} / ${catalog.length}` }), ' missions complete'),
        cal ? el('div', { class: 'home-stat' }, 'Your X gate: ', el('span', { class: 'mono', text: `${fmt.us(cal.tPi, 2)} · ${fmt.pct(cal.fidelity ?? 0, 1)}` })) : el('div', { class: 'home-stat muted', text: 'No gate calibrated yet (experiment 4)' }),
        el('a', { class: 'btn', href: '#/notebook', text: 'Lab notebook' }))),
    el('div', { class: 'exp-grid' }, ...cards),
    el('footer', { class: 'home-foot' },
      sound.el,
      button('Reset progress', () => { if (confirm('Erase all progress, predictions and calibrations on this device?')) { store.reset(); route(); } }),
      el('span', { class: 'muted', text: 'Progress is stored in this browser only.' })));
}

function notebook() {
  const cal = store.calibration;
  const rows = catalog.map((e) => {
    const p = store.progress(e.id);
    const preds = (p.predictions || []).map((q) => el('li', { class: q.correct ? 'is-correct' : 'is-wrong' }, el('span', { class: 'nb-step', text: q.stepId }), ` — you said “${q.guess}” `, el('b', { text: q.correct ? '✓' : '✗' })));
    return el('section', { class: 'nb-exp' },
      el('h3', null, `${e.number}. ${e.title} `, el('span', { class: `exp-status ${statusOf(e).cls}`, text: statusOf(e).label })),
      preds.length ? el('ul', { class: 'nb-preds' }, ...preds) : el('p', { class: 'muted', text: p.started ? 'No predictions recorded.' : 'Not started.' }),
      p.best ? el('p', { class: 'mono', text: `Best result: ${p.best}` }) : null);
  });
  const events = store.state.events;
  const download = () => {
    const blob = new Blob([store.exportCsv()], { type: 'text/csv' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'tiqc-lab-notebook.csv' });
    document.body.append(a); a.click(); a.remove();
  };
  return el('div', { class: 'home notebook' },
    topbar(),
    el('header', { class: 'home-head' },
      el('div', null, el('h1', { text: 'Lab notebook' }), el('p', { class: 'home-sub', text: 'Filled in automatically from your predictions, calibrations and completed missions.' })),
      el('div', { class: 'home-side' }, el('a', { class: 'btn', href: '#/', text: '← Experiments' }), button(`Export CSV (${events.length} events)`, download))),
    el('section', { class: 'card nb-cal' },
      el('h3', { text: 'Your machine' }),
      cal
        ? el('div', { class: 'nb-cal-grid mono' },
          el('div', null, 'π pulse: ', el('b', { text: fmt.us(cal.tPi, 2) })),
          el('div', null, 'π/2 pulse: ', el('b', { text: cal.tHalf ? fmt.us(cal.tHalf, 2) : '—' })),
          el('div', null, 'X-gate fidelity: ', el('b', { text: cal.fidelity != null ? fmt.pct(cal.fidelity, 1) : '—' })),
          el('div', null, 'MS gate: ', el('b', { text: cal.msTheta != null ? `θ = ${fmt.pi(cal.msTheta)} (${fmt.pct(cal.bellFidelity ?? 0, 1)} Bell fidelity)` : 'not calibrated' })))
        : el('p', { class: 'muted', text: 'No calibration yet. Experiment 4 gives you your own X gate.' })),
    ...rows);
}

window.addEventListener('hashchange', route);
route();
