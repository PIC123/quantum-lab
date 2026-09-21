# TIQC Lab 2.0 — plan, revised after the Phase 0 audit

Revised 2026-09-21. The original plan (`TIQC-Lab-2.0-Plan.md`, 2026-09-20) was written without seeing the app. This version records what the audit changed and what is now built. Sections that are unchanged from the original are summarised, not repeated.

## What changed after the audit

| Original plan | Revised | Why |
| --- | --- | --- |
| Get the repo, or mirror the site | Mirrored; snapshot committed under `site/` | The GitHub repo was empty. |
| TypeScript simulation core with a bundler | Plain ES modules with JSDoc, no build step; tests with `node --test` | The site is static files with no toolchain; deploy stays a file copy. TypeScript can be added later without moving files. |
| Zustand-style store | A 100-line observable store in `framework/store.js` | No framework on the site; nothing to integrate with. |
| Reuse the existing 3D engine for the lab view | 2D canvas for every experiment | Runs at 60 fps on a phone, keeps the module under 150 KB, and none of the eight experiments needs 3D to make its point. Three.js stays available for a future 3D view of experiments 1 and 6. |
| Ion species: match the existing lab | ⁴⁰Ca⁺ (397/866/729 nm) | The Diagram's labels fix it. |
| Phased build with an owner check-in after each phase | All eight experiments built in one pass on this branch | The owner asked for the audit and for "what improvements and labs you can make"; everything is on one branch and can be reviewed together. Nothing in the existing app was removed. |
| AR hooks | Not done | There is no AR mode in the current app to reuse (the menu item has no code behind it). |
| Assessment integration | Notebook + CSV export only | There is no Assessment section yet. The event log is shaped for it (`store.exportCsv()`). |

## Design principles (unchanged, and how they are implemented)

1. **Missions, not sandboxes.** `framework/mission.js`: every experiment is a list of steps; free play unlocks on completion.
2. **Predict, then run.** Step kind `predict` locks a choice, then resolves on the next run/scan event with feedback and a record in the notebook.
3. **Experience first, name second.** Vocabulary (Rabi oscillation, interference, dephasing, Bell state) appears in the feedback after the observation, never in the prompt before it.
4. **Progressive disclosure.** Explore / Understand / Math segmented control in the experiment header; cards carry a depth class and are hidden by CSS.
5. **Dual view.** The circuit view is generated from the same pulse list the lab view animates (`framework/views/circuit.js`); in experiment 5 the circuit is editable and edits change the pulses.

## The eight experiments as built

| # | Experiment | Core model (`labs/core/`) | Mission checks |
| --- | --- | --- | --- |
| 1 | Catch an Ion | `trap.js`: Mathieu parameters, Floquet stability map, live RK4 integration of the ion motion | hold 10 s; predict fly-out at high q; re-catch at 12 MHz; predict DC anti-confinement |
| 2 | Cool It Down | `cooling.js`: scattering force averaged over the ion's oscillation, recoil heating, Doppler limit | predict red vs blue; cool below 1 mK; reach 1.2× T_D and hold; predict blue heating |
| 3 | Bright or Dark | `detection.js`: Poisson counts, threshold accuracy, best threshold | one shot each state; predict spread; histograms; predict short-window overlap; 99 % rule + mystery streak |
| 4 | Find the π-Pulse | `pulses.js`: Rabi formula with detuning; calibration saved to the profile | fire; predict oscillation; π pulse ≥ 98 %; π/2 pulse; predict detuned scan |
| 5 | The Cancelling Coin | `qstate.js` + `pulses.js`; hidden qubit-laser offset for Ramsey | one π/2; predict two π/2; predict 180° phase; phase fringe; Ramsey with wait |
| 6 | Entangle Two Ions | `gates.js` MS gate; `bellFidelity`; CHSH game on the student's actual state | run; predict outcomes vs duration; Bell fidelity ≥ 90 % (saved); CHSH > 78 % |
| 7 | Noise Sandbox | `noise.js`: slow/fast dephasing, intensity jitter, heating, Y-echo | baseline; dephase; predict echo; fast noise; rescue contrast ≥ 0.8 at 200 µs |
| 8 | Missions | `circuits.js`: Grover, Deutsch–Jozsa, teleportation compiled into the student's pulses (CNOT from MS) | identify marked card; constant vs balanced; teleport fidelity ≥ 90 % |

The hidden "machine" (Rabi frequency, qubit-laser offset, MS rate) is drawn once per student and stored, so calibrations carry from 4 → 5, 7, 8 and from 6 → 8.

## Architecture as built

```
site/labs/
  index.html, labs.css, main.js      entry, theme, hash router (home / experiment / notebook)
  core/                              physics, no DOM: constants, rng, gates, qstate, pulses,
                                     detection, noise, trap, cooling, circuits
  framework/
    store.js                         profile, progress, calibrations, event log (localStorage)
    mission.js                       step engine (info / predict / task)
    runner.js                        layout, depth levels, mobile tabs, animation loop, ctx API
    ui.js                            el(), sliders, buttons, segmented, toggle, readouts, chime
    views/                           canvas base, lab2d, bloch, circuit (SVG), plot, mission-panel, math-panel
  experiments/                       index.js (catalog) + one module per experiment
tests/                               node --test, one file per core module
```

Engineering rules from the original plan hold: every core model has tests with known results (π pulse → P(1)=1, H·H = I, Bell state → only 00 and 11, Doppler limit = ħΓ/2k_B, Mathieu boundary at q ≈ 0.908, CNOT-from-MS decomposition); shots are sampled in batches; no experiment hard-codes a physical constant.

## Visual and UX

As specified: dark navy, ions and beams are the bright elements, one accent (cyan) for controls and one (green) for success, monospace for numbers and kets. Desktop: lab 60 % left, circuit / plots / Bloch on the right, mission panel sticky. Below 900 px: Lab / Data / Mission tabs in a bottom bar. Reduced motion disables sparks and skips pulse animations. Sound (photon clicks, success chime) is off by default. Controls are native inputs, so keyboard and screen readers work; the lab canvas carries a live text description in its `aria-label`.

## Still open (for the owner)

- **3D lab view.** The trap and two-ion scenes are 2D. If a 3D scene is wanted for experiments 1 and 6, the existing Three.js and glTF assets can be reused inside the same card; the physics and missions would not change.
- **Assessment section.** Decide what it should show (per-student notebook? class CSV?). The event log already records predictions, runs, mystery answers and completions with timestamps.
- **Accounts.** Everything is anonymous local storage. A backend is only needed if teachers must see student progress.
- **AR.** No AR code exists to reuse. Treat as a later, separate project.
- **Remaining audit items B7–B10** (duplicate IDs, implicit globals, per-panel render loops, accessibility of the old modules) need edits inside the existing sub-apps; not done without a go-ahead.
- **Content review.** A physicist should read the mission texts and the "Math" panels once; the simplifications are noted in code comments and in the Math panels, but the wording is mine.
