// Takes fresh screenshots of the shell and every experiment at desktop and
// phone sizes. Usage: start a static server on the site folder first, e.g.
//   npm run serve            (port 8080)
//   node tools/screenshots.mjs [baseUrl] [outDir]
// Uses the Playwright package (npm i -D playwright, or a global install).

import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
const { chromium, devices } = pw;

const BASE = process.argv[2] || 'http://127.0.0.1:8080/';
const OUT = process.argv[3] || 'docs/screenshots/labs';
mkdirSync(OUT, { recursive: true });

const experiments = ['catch-ion', 'cool-it-down', 'bright-or-dark', 'pi-pulse', 'cancelling-coin', 'entangle', 'noise-sandbox', 'missions'];
const browser = await chromium.launch();
for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['iPhone 13'] }]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // the shell with the labs open in a panel
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => { menu_click('vlabs'); select_block(1); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}-shell-vlabs-panel.png` });
  await page.goto(`${BASE}labs/`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-home.png`, fullPage: true });
  for (const id of experiments) {
    await page.goto(`${BASE}labs/#/exp/${id}`, { waitUntil: 'load' });
    await page.waitForTimeout(900);
    // give the animated experiments something to show
    if (id === 'catch-ion') { await page.getByRole('button', { name: 'Load ion' }).click(); await page.waitForTimeout(2500); }
    if (id === 'cool-it-down') { await page.getByRole('button', { name: 'Load hot ion' }).click(); await page.waitForTimeout(3000); }
    await page.screenshot({ path: `${OUT}/${name}-${id}.png`, fullPage: true });
    if (name === 'mobile') {
      await page.getByRole('button', { name: 'Data' }).click(); await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${id}-data.png`, fullPage: true });
      await page.getByRole('button', { name: 'Mission' }).click(); await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${id}-mission.png`, fullPage: true });
    }
    console.log(name, id);
  }
  await page.goto(`${BASE}labs/#/notebook`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}-notebook.png`, fullPage: true });
  console.log(name, 'errors:', errors.length ? errors : 'none');
  await ctx.close();
}
await browser.close();
