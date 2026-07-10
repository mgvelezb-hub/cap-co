---
name: run-capco-web
description: Build, run, and drive the CAP & Co. Next.js marketing site (capco-web). Use when asked to start the site, run its dev server, build it, take a screenshot of the landing page, or verify a UI change actually renders.
---

Next.js 15 / React 19 marketing site for "CAP & Co." (asesoría prendaria). It's
browser-driven: launch the dev server, then drive a headless Chromium against
it with the Playwright driver in this skill dir
(`.claude/skills/run-capco-web/driver.mjs`) — that's the primary agent path,
not `npm run dev` + eyeballing a browser window.

All paths below are relative to `PAGINA WEB/` (this project's root).

## Prerequisites

Verified on macOS (Darwin, arm64), Node v25.9.0 / npm 11.12.1. No OS packages
needed beyond Node — this is not a Linux/Electron build.

```bash
node --version   # v25.9.0 used this session; any current LTS should work
```

## Setup

Dependencies are already installed in `node_modules/`. If starting fresh:

```bash
npm install
```

The driver needs Playwright + a downloaded Chromium (added as a devDependency
this session, not previously in package.json):

```bash
npm install -D playwright   # already in package.json — rerun only if missing
npx playwright install chromium
```

## Build

```bash
npm run build
```

Verified this session: compiles, type-checks, and prerenders `/` and
`/_not-found` as static pages (~345 kB first load JS for `/`).

## Run (agent path)

1. **Start the dev server** and wait for it to actually serve — don't `sleep`
   a fixed amount, poll the port. (This machine has no GNU `timeout`/`gtimeout`
   — the classic `timeout 30 bash -c '...'` one-liner silently no-ops with
   "command not found" here, so use a plain counted loop instead:)

   ```bash
   npm run dev &
   echo $! > /tmp/capco-dev.pid
   for i in $(seq 1 30); do curl -sf http://localhost:3000 >/dev/null && break; sleep 1; done
   curl -sf http://localhost:3000 >/dev/null || echo "dev server failed to start"
   ```

   Stop it with `kill $(cat /tmp/capco-dev.pid)` before relaunching, or the
   next run hits `EADDRINUSE`.

   (If you're a Claude Code agent with the Preview tool available, this
   project already has `.claude/launch.json` configured with a `capco-web`
   entry — `preview_start(name: "capco-web")` does the same thing and gives
   you `preview_screenshot`/`preview_click`/`preview_eval` for interactive
   poking. The driver below is the portable path that works either way.)

2. **Drive it and screenshot:**

   ```bash
   node .claude/skills/run-capco-web/driver.mjs /tmp/capco-shots
   ```

   This navigates to `localhost:3000`, screenshots the hero
   (`01-hero.png`), clicks the first "Tu boleta" accordion item, waits for
   its detail panel, and screenshots that too (`02-accordion-open.png`).
   It prints a JSON summary (screenshot paths + any console errors) and
   exits non-zero if the page logged a console error. Screenshots land in
   the directory you pass as `argv[2]` (default `/tmp/capco-shots`).

3. **Stop the server:** `kill $(cat /tmp/capco-dev.pid)`.

## Run (human path)

```bash
npm run dev   # → opens on http://localhost:3000. Ctrl-C to stop.
```

## Gotchas

- **Reveal animations make screenshots come out blank.** Every section is
  wrapped in `<Reveal>` (`components/Reveal.js`): it sits at `opacity: 0`
  until an `IntersectionObserver` adds `.is-visible` post-hydration, then
  transitions over 0.8s (`app/globals.css`). Playwright's `waitFor({state:
  'visible'})` does **not** check opacity — it happily resolves while the
  element is still fully transparent, so a naive driver screenshots a page
  that's only the header. Fix used here: `page.emulateMedia({ reducedMotion:
  'reduce' })` right after opening the page — `globals.css` already has a
  `@media (prefers-reduced-motion: reduce)` rule that forces `.reveal` to
  `opacity: 1` with no transition, so content is visible immediately with no
  timing guesses.
- **Screenshot fails outright without extra Chromium flags.** `chromium.launch({
  args: ['--no-sandbox'] })` alone threw `Protocol error (Page.captureScreenshot):
  Unable to capture screenshot` on this machine. Adding `--disable-gpu` and
  `--disable-dev-shm-usage`, plus an explicit `newPage({ viewport: {...} })`,
  fixed it.
- **Desktop viewport avoids a scroll dance entirely.** At 1280×800 the
  "Tu boleta" section renders as two columns side by side — clicking an
  accordion item doesn't need to scroll anything into view. A narrow/mobile
  viewport stacks the columns and Playwright's auto-scroll-into-view on
  `.click()` can land mid-animation; if you need mobile screenshots, add a
  fixed pause after the click or re-check the reduced-motion trick above.
- **A pre-existing hydration-mismatch console warning is expected, not a
  driver bug.** The three range-slider inputs in `Calculadora`
  (`components/Calculadora.js`, the "¿Cuánto vas a pagar?" section) log a
  React hydration mismatch on `style` (`caret-color`) on first load — this
  reproduces with or without the driver's interaction step and isn't caused
  by anything the driver does. The driver still treats it as a real console
  error (exits non-zero) since that's the correct default; don't chase it as
  a driver bug if you see it.

## Troubleshooting

- **`ERR_CONNECTION_REFUSED` / "localhost rechazó la conexión" in a real
  browser tab**: the dev server isn't running (it doesn't survive between
  sessions). Restart it per "Run" above.
- **`Protocol error (Page.captureScreenshot): Unable to capture screenshot`**:
  missing `--disable-gpu --disable-dev-shm-usage` launch args — see Gotchas.
- **`timeout: command not found`**: this machine's shell has no GNU
  `timeout`/`gtimeout`. Use the counted `for`-loop poll shown in "Run
  (agent path)" instead of `timeout 30 bash -c '...'`.
