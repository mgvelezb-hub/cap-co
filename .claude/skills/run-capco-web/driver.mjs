#!/usr/bin/env node
// Drives the CAP & Co. Next.js site with a headless Chromium and proves it renders.
// Usage: node driver.mjs [outDir]
// Requires the dev server already running on http://localhost:3000 (see SKILL.md).
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const URL = process.env.CAPCO_URL || 'http://localhost:3000';
const outDir = process.argv[2] || '/tmp/capco-shots';
fs.mkdirSync(outDir, { recursive: true });

const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

// Every section is wrapped in <Reveal> (components/Reveal.js): opacity:0 until
// an IntersectionObserver adds .is-visible post-hydration, then an 0.8s CSS
// transition. Playwright's "visible" state does NOT check opacity, so a plain
// waitFor state:'visible' passes while the element is still fully transparent
// — screenshots come out blank below the header. app/globals.css already has
// a `@media (prefers-reduced-motion: reduce)` rule that forces .reveal to
// opacity:1/no-transition; emulating that media feature sidesteps the whole
// observer-timing problem instead of guessing wait times.
await page.emulateMedia({ reducedMotion: 'reduce' });

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=CAP & Co.', { timeout: 30000 });
await page.screenshot({ path: path.join(outDir, '01-hero.png') });

// One representative interaction: expand accordion item "1  El préstamo"
// and prove the detail panel actually renders (not just that the click fired).
const item = page.locator('button', { hasText: 'El préstamo' }).first();
await item.click();
await page.locator('text=avalúo típico').waitFor({ state: 'visible', timeout: 10000 });
await page.screenshot({ path: path.join(outDir, '02-accordion-open.png') });

await browser.close();

console.log(JSON.stringify({
  url: URL,
  screenshots: fs.readdirSync(outDir).map((f) => path.join(outDir, f)),
  consoleErrors: errors,
}, null, 2));

if (errors.length) process.exitCode = 1;
