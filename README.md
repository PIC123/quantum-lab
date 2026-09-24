# Virtual Trapped-Ion Quantum Computer Laboratories

Source for the TIQC Lab site (https://atelearning.com/TIQCLab/) plus the new **v-Labs** module of guided experiments.

```
site/            the deployable static site (copy this folder to the web host)
  index.html     landing page (experiments, apparatus, how it works)
  view.html      apparatus viewer: 3D model, beam diagram, spinning saddle
  classic.html   the original multipanel interface, unchanged
  content/       Equipment 3D and Simulation (Three.js)
  labs/          v-Labs: guided experiments (plain ES modules, no build)
tests/           unit tests for labs/core (node --test)
tools/           screenshot script
docs/            AUDIT.md, PLAN.md, screenshots
```

## Run locally

```
npm run serve          # serves site/ on http://localhost:8080
npm test               # runs the simulation-core tests (Node 20+)
node tools/screenshots.mjs http://127.0.0.1:8080/ docs/screenshots/labs
```

Open http://localhost:8080/ for the site, http://localhost:8080/labs/ for the experiments on their own, or http://localhost:8080/classic.html for the original multipanel interface.

## Deploy

Upload the contents of `site/` as-is. There is no build step; the labs are ES modules, so the host must serve `.js` files with a JavaScript MIME type (every normal web server does).

## Adding an experiment

1. Create `site/labs/experiments/<id>.js` exporting `meta` and `create(ctx)` (see `pi-pulse.js` for the pattern: build views with `ctx.card(...)`, controls into `ctx.controls`, return `{ steps, frame, dispose }`).
2. Add it to `site/labs/experiments/index.js`.
3. Put any physics in `site/labs/core/` with a test in `tests/`; experiments must not hard-code physical constants.
