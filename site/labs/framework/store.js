// One store for the student's profile: calibrations, progress, predictions
// and an event log. Persisted to localStorage (anonymous use); the log can
// be exported as CSV for an Assessment section later.

const KEY = 'tiqclab.v1';
const MAX_EVENTS = 2000;

const defaults = () => ({
  version: 1,
  createdAt: Date.now(),
  settings: { depth: 'explore', sound: false },
  /** Hidden machine parameters, fixed per student so the labs feel like one machine. */
  machine: null,
  /** The student's own gate calibration from experiment 4 (and MS from 6). */
  calibration: null,
  /** Per-experiment progress keyed by experiment id. */
  progress: {},
  /** Event log: predictions, runs, completions. */
  events: [],
});

export class Store {
  constructor(key = KEY) {
    this.key = key;
    this.listeners = new Set();
    this.state = this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaults(), ...parsed, settings: { ...defaults().settings, ...(parsed.settings || {}) } };
      }
    } catch { /* corrupt or unavailable storage: start fresh */ }
    return defaults();
  }

  #save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch { /* quota or private mode */ }
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Mutate the state in place through fn, then persist and notify. */
  update(fn) {
    fn(this.state);
    this.#save();
    this.listeners.forEach((l) => l(this.state));
  }

  get settings() { return this.state.settings; }
  setSetting(k, v) { this.update((s) => { s.settings[k] = v; }); }

  /** Get or create the hidden machine parameters. */
  machine(create) {
    if (!this.state.machine) this.update((s) => { s.machine = create(); });
    return this.state.machine;
  }

  get calibration() { return this.state.calibration; }
  setCalibration(patch) {
    this.update((s) => { s.calibration = { ...(s.calibration || {}), ...patch, updatedAt: Date.now() }; });
    this.log('calibration', patch);
  }

  progress(id) {
    return this.state.progress[id] || { started: false, completed: false, step: 0, predictions: [], best: null };
  }

  setProgress(id, patch) {
    this.update((s) => { s.progress[id] = { ...this.progress(id), ...patch }; });
  }

  /** Record a prediction and whether it was right. */
  recordPrediction(id, stepId, guess, correct, detail) {
    this.update((s) => {
      const p = s.progress[id] = { ...this.progress(id) };
      p.predictions = [...(p.predictions || []), { stepId, guess, correct, detail, ts: Date.now() }];
    });
    this.log('prediction', { experiment: id, step: stepId, guess, correct, detail });
  }

  log(type, data = {}) {
    this.update((s) => {
      s.events.push({ ts: Date.now(), type, ...data });
      if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
    });
  }

  /** The events as CSV (ts, type, then a JSON column for the rest). */
  exportCsv() {
    const rows = [['timestamp', 'type', 'experiment', 'step', 'detail']];
    for (const e of this.state.events) {
      const { ts, type, experiment = '', step = '', ...rest } = e;
      rows.push([new Date(ts).toISOString(), type, experiment, step, JSON.stringify(rest)]);
    }
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  reset() {
    this.state = defaults();
    this.#save();
    this.listeners.forEach((l) => l(this.state));
  }
}
