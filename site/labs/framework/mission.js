// The mission engine: a list of steps that an experiment walks the student
// through. Step kinds:
//   info     — text and a "Got it" button.
//   predict  — the student commits to a choice (or a slider value) before
//              running; resolve(guess, ctx, data) is called when the event in
//              `on` fires and returns { correct, text }.
//   task     — check(ctx) returns true | false | { done, progress, hint }.
//              The step completes when done.
// Every step may carry `why` (shown behind a "Why?" button) and
// onEnter/onDone hooks.

export class Mission {
  /**
   * @param {object} opts
   * @param {string} opts.id experiment id
   * @param {Array} opts.steps
   * @param {import('./store.js').Store} opts.store
   * @param {object} opts.ctx experiment context passed to hooks
   */
  constructor({ id, steps, store, ctx }) {
    this.id = id;
    this.steps = steps;
    this.store = store;
    this.ctx = ctx;
    this.listeners = new Set();
    const saved = store.progress(id);
    this.index = saved.completed ? steps.length : 0; // always restart an unfinished mission from step 0
    this.locked = null;       // the pending prediction {guess, label}
    this.feedback = null;     // {correct, text} after a prediction resolves
    this.taskDone = false;
    this.completed = saved.completed;
    this.free = saved.completed;
    store.setProgress(id, { started: true });
  }

  get step() { return this.steps[this.index] || null; }
  get total() { return this.steps.length; }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit() { this.listeners.forEach((l) => l(this)); }

  start() {
    if (this.completed) { this.#emit(); return; }
    this.#enter();
  }

  #enter() {
    this.locked = null; this.feedback = null; this.taskDone = false;
    this.step?.onEnter?.(this.ctx);
    this.store.setProgress(this.id, { step: this.index });
    this.#emit();
  }

  /** Advance to the next step (or finish). */
  next() {
    if (!this.step) return;
    this.step.onDone?.(this.ctx);
    this.index++;
    if (this.index >= this.steps.length) this.#finish();
    else this.#enter();
  }

  #finish() {
    this.completed = true; this.free = true;
    this.store.setProgress(this.id, { completed: true, completedAt: Date.now(), step: this.index });
    this.store.log('completed', { experiment: this.id });
    this.#emit();
  }

  /** Lock in a prediction. */
  predict(guess, label) {
    if (this.step?.kind !== 'predict' || this.locked) return;
    this.locked = { guess, label };
    this.store.log('predict', { experiment: this.id, step: this.step.id, guess, label });
    if (this.step.on === 'lock') this.#resolve();
    else this.#emit();
  }

  /** Called by the experiment for events like 'run' or 'scan'. */
  event(name, data) {
    const s = this.step;
    if (!s) return;
    if (s.kind === 'predict' && this.locked && !this.feedback && (s.on || 'run') === name) this.#resolve(data);
    this.poll();
  }

  #resolve(data) {
    const res = this.step.resolve(this.locked.guess, this.ctx, data);
    if (!res) return; // not resolvable yet (e.g. needs more data)
    this.feedback = res;
    this.store.recordPrediction(this.id, this.step.id, this.locked.label ?? this.locked.guess, res.correct, res.detail);
    this.#emit();
  }

  /** Re-evaluate a task step. Call after every state change. */
  poll() {
    const s = this.step;
    if (!s || s.kind !== 'task' || this.taskDone) return;
    const r = s.check(this.ctx);
    const done = r === true || (r && r.done);
    this.progress = r && typeof r === 'object' ? r.progress ?? null : null;
    this.hint = r && typeof r === 'object' ? r.hint ?? null : null;
    if (done) { this.taskDone = true; this.store.log('task', { experiment: this.id, step: s.id }); }
    this.#emit();
  }

  /** Restart from the first step, keeping free-play unlocked if earned. */
  restart() {
    this.index = 0; this.completed = false;
    this.store.setProgress(this.id, { completed: false, step: 0 });
    this.#enter();
  }
}
