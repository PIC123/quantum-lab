// Shared behaviour for the site shell: header navigation, the animated hero
// and the experiment cards (read from the labs catalog so they never drift).

export function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('is-open')));
}

/** Experiment cards for the landing page, with progress from local storage. */
export async function renderExperimentCards(container) {
  const { catalog } = await import('../labs/experiments/index.js');
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem('tiqclab.v1') || '{}').progress || {}; } catch { /* no storage */ }
  container.replaceChildren(...catalog.map((e) => {
    const p = progress[e.id] || {};
    const status = p.completed ? ['Completed', 'is-done'] : p.started ? ['In progress', 'is-active'] : ['Not started', ''];
    const a = document.createElement('a');
    a.className = 'card'; a.href = `labs/#/exp/${e.id}`;
    a.innerHTML = `<span class="card-num">EXPERIMENT ${e.number}</span><h3>${e.title}</h3><span class="concept">${e.concept}</span><span class="mission"><b>Mission</b>${e.mission}</span><span class="status ${status[1]}">${status[0]}</span><span class="arrow" aria-hidden="true">→</span>`;
    return a;
  }));
}

/** The hero: a live ion that gets pulsed and read out every few seconds. */
export async function startHero(container) {
  const { LabScene } = await import('../labs/framework/views/lab2d.js');
  const scene = new LabScene(container, { aspect: 16 / 10 });
  scene.canvas.style.position = 'absolute';
  const beams = { qubit: { id: '729', on: 0, label: '729 nm qubit laser' }, det: { id: '397', on: 0.35, label: '397 nm detection', angle: Math.PI / 5 } };
  scene.setBeams([beams.det, beams.qubit]);
  const ion = { x: 0, glow: 0.6, label: '40Ca+' };
  scene.setIons([ion]); scene.setCamera(true, 0.6);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let t = 0, phase = 0, last = performance.now(), dark = false;
  const caption = container.parentElement.querySelector('.hero-caption');
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!reduced) {
      const cycle = t % 4;
      if (cycle < 0.6) { // pulse
        if (phase !== 1) { phase = 1; beams.det.on = 0; ion.glow = 0; scene.setCamera(true, 0); dark = Math.random() < 0.5; if (caption) caption.textContent = 'π/2 pulse on the qubit laser'; }
        beams.qubit.on = 1;
      } else if (cycle < 1.6) { // detection
        beams.qubit.on = 0;
        if (phase !== 2) { phase = 2; beams.det.on = 1; ion.glow = dark ? 0 : 1; scene.setCamera(true, dark ? 0 : 1); if (caption) caption.textContent = dark ? 'readout: dark → |1⟩' : 'readout: bright → |0⟩'; }
        if (!dark && Math.random() < 0.5) scene.emit(0, 1);
      } else if (phase !== 0) { phase = 0; beams.det.on = 0.35; ion.glow = 0.6; scene.setCamera(true, 0.6); if (caption) caption.textContent = 'ion ready in |0⟩'; }
    }
    scene.tick(dt); scene.draw();
    if (!document.hidden) requestAnimationFrame(loop); else setTimeout(() => requestAnimationFrame(loop), 300);
  }
  requestAnimationFrame(loop);
}
