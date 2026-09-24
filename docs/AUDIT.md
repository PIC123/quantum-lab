# TIQC Lab — Phase 0 audit of the existing app

Audited 2026-09-21 against the live site at https://atelearning.com/TIQCLab/.

## 1. Source

- The GitHub repo `PIC123/quantum-lab` was empty (no branches, no commits) when the audit started, so the plan's fallback applied: the live site was mirrored.
- A byte-faithful copy of every file the site serves is committed under `site/` (61 files, 9.9 MB). The two glTF models and the six cube-map textures, which `wget --mirror` cannot discover because JavaScript loads them, were fetched separately.
- Nothing in the app is bundled or built. The only minified files are third-party libraries (`three.min.js`, `jquery-ui.min.js`, `stats.min.js`). All first-party code is readable, unminified JavaScript with Russian-language comments and object names.
- There is no `package.json`, no build step, no tests and no server-side code. The site is plain static files, so a deploy is a file copy.

## 2. Screenshots

All captures are in `docs/screenshots/existing/`, taken with headless Chromium at desktop (1440×900) and phone (390×844) sizes from a local copy of the mirror.

| File | What it shows |
| --- | --- |
| `desktop-01-landing-multipanel.png` | Landing page: four empty panels |
| `desktop-04-simulation-panel3.png` | Equipment 3D, Diagram and Simulation open in panels 1–3 |
| `desktop-05-tabs-mode-tab1.png` | Same content after switching to the tabbed interface |
| `desktop-07..09-equipment-3d-*.png` | Equipment 3D full screen: default, labels on, View 2 |
| `desktop-10..12-diagram-*.png` | Diagram: default, labels on, chip zoom after clicking the chamber |
| `desktop-13..15-simulation-*.png` | Simulation: idle, spinning with ball, high speed |
| `mobile-*.png` | The same 15 screens at phone size |
| `iphone-ua-equipment.png`, `iphone-ua-simulation.png` | The two Three.js apps loaded with an iPhone user agent: both stuck on "Loading..." (see bug B1) |

## 3. Stack

| Layer | What is used | Notes |
| --- | --- | --- |
| Shell (`index.html`, `js/root.js`, `css/style.css`) | Hand-written HTML, jQuery 1.10.2, jQuery UI 1.12.1 (draggable splitters), `jquery.touch.js` | Four fixed `div` "blocks", each holding an `<iframe>`. `open_page(url)` injects an iframe into the chosen block. Multipanel ↔ tabs toggle. No router, no state, no persistence. |
| Equipment 3D (`content/quantum_computer/`) | Three.js (global-script build, ~r13x era), `GLTFLoader`, `OrbitControls`, `stats.min.js`, `dat.gui` from cdnjs | Loads `model/quantum.glb` (2.4 MB) and six cube-map JPEGs (0.7 MB). Labels are text meshes inside the model, toggled by name. `dat.gui` is loaded from a CDN but every use of it is commented out. |
| Diagram (`diagram.htm`) | Static JPEG plus PNG overlays, absolutely positioned hotspots, CSS-scaled 1200 px canvas (`js/zoom.js`) | Eight label `div`s; only hotspot 1 (the chamber) has a click handler, which zooms the chip. `sim_common.js` and `debug.js` are loaded but unused. |
| Simulation (`content/sim4/`) | Three.js, `GLTFLoader`, `OrbitControls`, same fixed-layout scaling | Rotating hyperbolic paraboloid ("spinning saddle") plus a small glTF with three baked ball animations. Sliders for RF frequency/voltage, DC voltage and a "Speed" knob. |
| AR, v-Labs, Assessment, Resources | Nothing | Menu items exist but no code handles them (see B2). |

**Ion species.** The Diagram labels describe 423 nm + 379 nm photo-ionisation, a 397 nm cooling/detection laser and an 866 nm repump. That is calcium-40 (⁴⁰Ca⁺). This answers the plan's open question: new experiments should model Ca⁺.

**How the multipanel system loads sub-apps.** Every sub-app is an ordinary HTML page opened by URL in an iframe. That is the extension point: any new module that is a static page can be added to the shell by one `case` in `open_block()` in `js/root.js`. The iframe gets `allow='fullscreen'`, so a module can go full screen on its own.

## 4. Content inventory

| Module | What it teaches | Controls | Works? | Notes |
| --- | --- | --- | --- | --- |
| Equipment 3D | Physical layout of a trapped-ion apparatus: vacuum chamber, ion pump, ion gauge, camera and objective, helical resonator | Orbit/zoom, View 1 / View 2 radio, Show labels | Yes on desktop. **Crashes on phones and tablets** (B1) | Good model quality. 2.4 MB download with no size hint. Labels only in English text meshes; no description of what each part does. |
| Diagram | Names of the beams and parts around the chamber | Labels on/off, Reset, click chamber to zoom chip | Yes | Physics text errors (B4). Only one of eight hotspots is interactive. |
| Simulation | Why a rotating saddle potential traps a charge (the Paul trap analogy) | Speed 1–5 "kHz", RF vertical and horizontal frequency 1–5 kHz and voltage 1–20 kV, DC voltage 0–30 kV, Start, Place ball | Yes on desktop. **Crashes on phones and tablets** (B1) | No physics model. The RF sliders only rescale a static sine image and reshape the saddle; the ball's fate is one of three canned animations chosen by Speed thresholds (below 1.5 falls, 1.5–4 stays, 4 and above flies out). The DC panel plots √V. Units on the sliders (kHz, kV) do not correspond to anything in the model. |
| v-Labs, Assessment, Resources, AR | — | — | No | No handlers. The plan's headline sections do not exist yet. |

## 5. Bugs and defects found

Numbered so the plan and the changelog can refer to them.

- **B1 — Both Three.js apps crash on phones and tablets.** `init()` in `content/quantum_computer/my_code.js` and `content/sim4/my_code.js` does `document.getElementById("btn1").style.fontSize = "30px"` when the user agent matches `android|iphone|kindle|ipad`. The `btn1` element is commented out in both HTML files, so this throws `TypeError: Cannot read properties of null` before the renderer is created. The page stays on "Loading..." forever. Reproduced with Playwright's iPhone 13 profile; see the `iphone-ua-*.png` screenshots. One-line fix: guard the lookup.
- **B2 — Most menu items do nothing.** `open_block()` handles only `equipment`, `diagram` and `simulation`. `v-Labs`, `Assessment`, `Resources` and `AR` are inert. In the hamburger menu (the only menu shown below 800 px), Diagram calls `menu_click('nowvlabs')` and Simulation calls `menu_click('workflow')`, so neither opens anything: on a phone only Equipment → 3D works.
- **B3 — No viewport meta tag** in any page. Phones render the 980 px desktop layout and shrink it; every control in the Simulation is a few pixels wide on a 390 px screen (`mobile-13-simulation-direct.png`).
- **B4 — Physics text errors in the Diagram.** The 866 nm "Repump" label reuses the 397 nm description ("drives a strong cycling transition used for Doppler cooling and fluorescence detection"), which is wrong: the repump returns the ion from the metastable D₃/₂ level so that cooling can continue. The vacuum-chamber label reads "Typical operating pressures are below Torr" with the number missing. The page title is "Diargram".
- **B5 — Typo and dead links in the hamburger menu.** "v-Lavs" for v-Labs; hrefs are `#`, which scroll the page to the top on tap.
- **B6 — External dependency on cdnjs for `dat.gui`** in both Three.js apps although no code uses it. On an offline or filtered school network this is a blocked request on every load.
- **B7 — Duplicate element IDs** (`myRange1`, `sliderValue1`, `slide1`, `label1_1`) across the Simulation's four fieldsets. It works because the code scopes its queries, but it is invalid HTML and breaks `<label for>` and screen readers.
- **B8 — Implicit globals** (`cubemap`, `gl`, `mixer`, `anim1`, `obj`, `fl1..fl4`) in both Three.js apps and in `root.js`. Harmless today; a hazard for anyone extending the code.
- **B9 — Each open panel runs its own `requestAnimationFrame` loop** with its own copy of Three.js. Four open panels on a Chromebook will be slow; there is no pause when a panel is hidden in tabs mode.
- **B10 — Accessibility.** No `alt` text, no keyboard operation of panels or menus, no focus styles, information in colour only, no reduced-motion handling.

## 6. Extend or rebuild?

**Extend.** The shell is workable for its job: it opens any static page in a panel and supports the side-by-side layout the plan wants. There is no reason to rewrite it, and the owner's request was to keep existing sections working.

The recommendation, implemented in this branch:

1. **New labs live in one self-contained static module, `labs/`.** It has its own entry page (`labs/index.html`), works standalone (open the file over any static server) and inside the shell (opened in a panel like the other sub-apps). It does not touch the three existing sub-apps.
2. **Wire it to the existing "v-Labs" menu item** with one new `case` in `open_block()`. That is the only shell change the module needs.
3. **No build step.** The plan proposed TypeScript. The audit changes that: the site is static files copied to a host, and there is no Node toolchain in the project. The labs are written as plain ES modules with JSDoc types, so deploying is still a file copy, and the simulation core is unit-tested with Node's built-in test runner (`node --test`), which needs no dependencies. TypeScript can be introduced later without changing the module layout; everything else in the plan's architecture section (one simulation core, config-driven experiments, one store, views kept in sync) is kept.
4. **2D first, 3D where it earns its place.** Experiments 3, 4, 5 and 7 need an ion, a beam, a Bloch sphere and plots. Those are drawn on Canvas, which runs at 60 fps on a phone and keeps the module under 100 KB. Experiments 1, 2 and 6 (trap, cooling, two ions) can use Three.js, which the site already ships.
5. **Fix B1–B6 in the existing app now.** They are small, safe changes (a null guard, four menu handlers, one meta tag, three label texts, one removed script tag). They are in a separate commit so they can be reviewed or reverted independently. B7–B10 are noted but not changed: they need a rewrite of the affected files, which the plan says to ask about first.

## 7. Answers to the plan's open questions

| Question | Answer from the audit |
| --- | --- |
| Source as repo or live site? | Live site only; now snapshotted in `site/`. |
| Ion species? | ⁴⁰Ca⁺ (397/866/423/379 nm). |
| Student accounts? | None. There is no backend; local storage is the right default. |
| Assessment export? | No Assessment section exists yet, so nothing to integrate with. The labs log events to local storage in a shape that can be exported to CSV later. |
| Sections that must stay? | All three working modules stay as they are. |
| Branding? | Two logos in the header (NC A&T "TIQP" and ATeL); kept. |
| Target devices? | The current app is desktop-only in practice (B1, B3). The new labs are built and screenshot-tested at both sizes. |

## 8. What was changed in this branch

- `site/`: the snapshot, then the B1–B6 fixes in a separate commit, then a new front end: `index.html` (landing page), `view.html` (apparatus viewer) and `css/site.css`. The original multipanel shell is unchanged and reachable as `classic.html`; the three sub-apps are untouched.
- `site/labs/`: the new v-Labs module with all eight experiments of the plan, wired to the v-Labs menu. Screenshots of every experiment at desktop and phone size are in `docs/screenshots/labs/`.
- `tests/`: unit tests for the simulation core (`npm test`).
- `docs/PLAN.md`: the plan revised to match this audit. `CHANGELOG.md`: the summary.
