# Changelog

All notable changes to the TIQC Lab site and the v-Labs module.

## 2.0.0 — 2026-09-21

### Added
- `docs/AUDIT.md`: Phase 0 audit of the live site with screenshots in `docs/screenshots/existing/`.
- `docs/PLAN.md`: the TIQC Lab 2.0 plan revised to match the audit.
- `site/labs/`: the v-Labs module, a self-contained set of guided experiments that the shell opens from the new **v-Labs** menu item. Plain ES modules, no build step.
  - Simulation core (`labs/core/`): 1–3 qubit state vectors and gates, laser pulses to unitaries, photon-count detection, Ramsey noise models with spin echo, Mathieu-equation trap stability and ion motion, Doppler cooling, and Grover / Deutsch–Jozsa / teleportation circuits compiled into the student's own pulses. 58 unit tests (`npm test`).
  - Experiment framework (`labs/framework/`): mission engine with predict-then-run steps, Explore / Understand / Math depth levels, persistent progress and calibrations in local storage, lab notebook with CSV export, mobile tab layout, reduced-motion support.
  - Views: 2D lab scene with ion fluorescence and laser beams, Bloch sphere, SVG circuit synced with the pulse sequence, plots and histograms, math panel.
  - All eight experiments from the plan: Catch an Ion, Cool It Down, Bright or Dark, Find the π-Pulse, The Cancelling Coin, Entangle Two Ions (with the CHSH game), Noise Sandbox, Missions.
- `tools/screenshots.mjs`: takes fresh desktop and phone screenshots of every screen.

### Fixed (existing site, see audit items B1–B6)
- Equipment 3D and Simulation no longer crash on phones and tablets (missing `#btn1` element).
- Hamburger menu: Diagram and Simulation entries now open their pages; "v-Lavs" typo.
- Viewport meta tag on the shell page.
- Diagram text: repump laser description, missing vacuum pressure value, page title.
- Removed the unused `dat.gui` CDN script from both Three.js apps.

### Not changed
- The Equipment 3D, Diagram and Simulation modules keep their behaviour. Assessment, Resources and AR remain placeholders (no handlers), as before.
