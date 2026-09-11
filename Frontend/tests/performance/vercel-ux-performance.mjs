import { chromium } from '@playwright/test';
import { startTrace, finishTrace } from './ux-trace.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';

const get = (key, fallback) => { const i = process.argv.indexOf(`--${key}`); return i < 0 ? fallback : process.argv[i + 1]; };
const target = new URL(get('target', ''));
const phase = get('phase', 'pilot');
const output = path.resolve(get('output', ''));
const deploymentId = get('deployment-id', '');
if (!target.hostname.endsWith('.vercel.app') || !deploymentId) throw Error('Fixed Vercel Preview and deployment ID required');
if (!['smoke', 'pilot', 'main', 'trace'].includes(phase)) throw Error('Unknown phase');
if (existsSync(path.join(output, 'manifest.json'))) throw Error('Use a new output directory');
mkdirSync(path.join(output, 'raw'), { recursive: true });
const protocol = { phase, imageCondition: 'S', cacheCondition: 'warm', count: 1000, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, headless: true, cpuSlowdown: 1, networkThrottling: false, concurrency: 1, seed: 20260909, primary: 'LoAF blockingDuration sum of entries with startTime in scroll interval', wheel: { tickMs: 50, delta: 30, scrollMsEachDirection: 10000, clickScrollMs: 3000, x: 195, y: 422 }, warmup: { tickMs: 10, delta: 60, distance: { scroll: 6000, click: 1800 }, directions: 'down then up', settleMs: 400 }, idleMs: 2000, recoveryMs: 1000, observerDeliveryGraceMs: 300, clickDelayAfterFinalWheelAckMs: 50, modalTimeoutMs: 5000, externalWatchdogMs: 90000, pathTolerancePx: 60, externalInput: 'CDP Input.dispatchMouseEvent mouseWheel and mousePressed/mouseReleased; mobile viewport, not touch emulation', offCondition: 'No continuous rAF/PerformanceObservers; same scroll event log and functional/modal probes', timingExclusions: 'No screenshots, video, trace, full DOM traversal or network logging during measured interval', rounds: phase === 'main' ? 30 : phase === 'pilot' ? 3 : 1 };
writeFileSync(path.join(output, 'protocol.json'), JSON.stringify(protocol, null, 2));
let state = protocol.seed >>> 0;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2 ** 32; };
const schedule = [];
for (const scenario of ['scroll', 'click']) for (let pair = 1; pair <= protocol.rounds; pair++) for (const instrumentation of phase === 'pilot' ? [false, true] : [true]) for (const mode of random() < .5 ? ['all', 'virtual'] : ['virtual', 'all']) schedule.push({ scenario, pair, instrumentation, mode, id: `${scenario}-${pair}-${instrumentation ? 'on' : 'off'}-${mode}` });
if (phase === 'trace') schedule.splice(0, schedule.length, ...JSON.parse(readFileSync(get('trace-selection', ''), 'utf8')));
writeFileSync(path.join(output, 'schedule.json'), JSON.stringify(schedule, null, 2));
const manifest = [];
const browser = await chromium.launch({ headless: true });
writeFileSync(path.join(output, 'environment.json'), JSON.stringify({ target: target.href, deploymentId, commit: get('commit', null), browser: browser.version(), os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model, ramBytes: os.totalmem(), powerMode: 'High performance', startedAt: new Date().toISOString(), browserCache: 'fresh context; Playwright routing disables HTTP cache', cdnCache: 'not cleared', auth: 'Preview access cookie, never serialized in results', protocol }, null, 2));
const cookieFile = process.env.VERCEL_BENCHMARK_COOKIE_FILE;
if (!cookieFile) throw Error('Preview cookie file required');
const cookies = readFileSync(cookieFile, 'utf8').split(/\r?\n/).filter(l => l && (!l.startsWith('#') || l.startsWith('#HttpOnly_'))).map(line => { const [domain, , cookiePath, secure, expiry, name, value] = line.replace(/^#HttpOnly_/, '').split('\t'); return { name, value, domain, path: cookiePath, secure: secure === 'TRUE', httpOnly: line.startsWith('#HttpOnly_'), ...(Number(expiry) > 0 ? { expires: Number(expiry) } : {}) }; });

async function snapshot(page) {
  return page.locator('[data-benchmark-feed]').evaluate(el => {
    const cards = [...el.querySelectorAll('[data-photo-id]')];
    const r = el.getBoundingClientRect();
    const visible = cards.filter(c => { const b = c.getBoundingClientRect(); return b.bottom > r.top && b.top < r.bottom; });
    return { top: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, loaded: +el.dataset.loadedCount, filtered: +el.dataset.filteredCount, cards: cards.length, visibleIds: visible.map(c => c.dataset.photoId), ready: visible.length > 0 && visible.every(c => { const i = c.querySelector('img'); return i?.complete && i.naturalWidth > 0 && !i.dataset.originalUrl; }), visibility: document.visibilityState, modalClosed: !document.querySelector('[data-photo-modal-id]') };
  });
}
async function settle(page) {
  let previous = '', stable = 0;
  for (let i = 0; i < 100; i++) { await sleep(100); const s = await snapshot(page); const key = JSON.stringify([s.top, s.scrollHeight, s.cards, s.visibleIds]); stable = s.ready && key === previous ? stable + 1 : 0; previous = key; if (stable >= 3) return s; }
  throw Error('Preparation layout/image timeout');
}
async function wheel(cdp, delta, tickMs, durationMs, inputs, label) {
  const origin = performance.now();
  const n = Math.round(durationMs / tickMs);
  for (let i = 0; i < n; i++) {
    const plannedAt = origin + i * tickMs;
    await sleep(Math.max(0, plannedAt - performance.now()));
    const sentAt = performance.now();
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 422, deltaX: 0, deltaY: delta });
    if (inputs) inputs.push({ label, index: i, delta, plannedAt, sentAt, ackAt: performance.now() });
  }
  await sleep(Math.max(0, origin + durationMs - performance.now()));
}
async function execute(context, spec, run) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  page.on('crash', () => { run.crashed = true; });
  page.on('pageerror', e => run.errors.push({ type: 'runtime', message: e.message }));
  page.on('requestfailed', r => run.errors.push({ type: 'request', url: new URL(r.url()).pathname, message: r.failure()?.errorText }));
  let timed = false;
  page.on('response', response => { if (response.status() >= 400) run.errors.push({ type: 'http', status: response.status(), path: new URL(response.url()).pathname }); if (!timed) run.assets.push({ path: new URL(response.url()).pathname, status: response.status(), cache: response.headers()['x-vercel-cache'] ?? null }); });
  await page.route('**/*', route => new URL(route.request().url()).origin === target.origin ? route.continue() : (run.errors.push({ type: 'external-request', origin: new URL(route.request().url()).origin }), route.abort()));
  const destination = new URL('/virtualization-benchmark.html', target);
  destination.search = new URLSearchParams({ mode: spec.mode, count: '1000' }).toString();
  await page.goto(destination.href, { waitUntil: 'networkidle', timeout: 30000 });
  run.initial = await settle(page);
  if (run.initial.loaded !== 1000 || run.initial.filtered !== 1000 || !run.initial.modalClosed || run.initial.visibility !== 'visible') throw Error('Invalid fixture/initial state');
  run.warmup = { start: performance.now() };
  const distance = protocol.warmup.distance[spec.scenario];
  await wheel(cdp, 60, 10, distance / 60 * 10, null, 'warm-down');
  await wheel(cdp, -60, 10, distance / 60 * 10, null, 'warm-up');
  run.prepared = await settle(page);
  run.warmup.end = performance.now();
  if (run.prepared.top > 1) throw Error('Warmup did not return to top');
  await page.addScriptTag({ path: new URL('./ux-probe.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
  await page.evaluate(on => window.uxProbe.start(on), spec.instrumentation);
  if (phase === 'trace') await startTrace(cdp);
  timed = true;
  await page.evaluate(() => window.uxProbe.mark('idleStart'));
  await sleep(2000);
  await page.evaluate(() => window.uxProbe.mark('scrollStart'));
  run.externalStart = performance.now();
  const duration = spec.scenario === 'scroll' ? 10000 : 3000;
  await wheel(cdp, 30, 50, duration, run.inputs, 'down');
  if (spec.scenario === 'scroll') {
    await page.evaluate(() => window.uxProbe.mark('turn'));
    await wheel(cdp, -30, 50, 10000, run.inputs, 'up');
  }
  run.externalEnd = performance.now();
  await page.evaluate(() => window.uxProbe.mark('scrollEnd'));
  if (spec.scenario === 'click') {
    // Exactly based on the final command acknowledgement; no locator actionability wait.
    const finalAck = run.inputs.at(-1).ackAt;
    await sleep(Math.max(0, finalAck + 50 - performance.now()));
    run.pointer = { plannedAt: finalAck + 50, pressSentAt: performance.now() };
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 422, button: 'left', clickCount: 1 });
    run.pointer.releaseSentAt = performance.now();
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 195, y: 422, button: 'left', clickCount: 1 });
    run.pointer.ackAt = performance.now();
    await page.waitForFunction(() => window.uxProbe.modalStatus()?.readyAt || window.uxProbe.modalStatus()?.timedOut, null, { timeout: 5500, polling: 100 }).catch(() => {});
    // Keep observers alive for delayed Event Timing delivery, not part of modal-ready metric.
    await sleep(1000);
  }
  await sleep(1000);
  await page.evaluate(() => window.uxProbe.mark('recoveryEnd'));
  await sleep(300);
  run.probe = await page.evaluate(() => window.uxProbe.finish());
  timed = false;
  if (phase === 'trace') await finishTrace(cdp, path.join(output, `${spec.id}.trace.json`));
  run.final = await snapshot(page);
  const scrollTops = run.probe.scroll.filter(s => s.at >= run.probe.marks.scrollStart && s.at <= run.probe.marks.scrollEnd).map(s => s.top);
  run.path = { expectedPeak: spec.scenario === 'scroll' ? 6000 : 1800, peak: Math.max(run.prepared.top, ...scrollTops), end: run.final.top, eventCount: run.inputs.length, expectedEvents: spec.scenario === 'scroll' ? 400 : 60, maxSendLatenessMs: Math.max(...run.inputs.map(i => i.sentAt - i.plannedAt)), absoluteScrollTravel: run.probe.scroll.reduce((acc,s,i,a) => acc + Math.abs(s.top - (i ? a[i-1].top : run.prepared.top)), 0) };
  run.path.comparable = Math.abs(run.path.peak - run.path.expectedPeak) <= 60 && run.path.eventCount === run.path.expectedEvents && (spec.scenario !== 'scroll' || Math.abs(run.path.end) <= 1);
  run.functional = spec.scenario === 'scroll' ? run.final.ready : !!run.probe.modal?.readyAt && run.probe.modal.click.photoId === run.probe.modal.modalId && run.probe.finalSelection === run.probe.modal.click.photoId;
  run.valid = run.path.comparable && run.functional && run.probe.initialVisibility === 'visible' && run.probe.finalVisibility === 'visible' && run.probe.visibility.length === 0 && !run.probe.overflow && run.errors.length === 0;
  if (!run.valid) run.failure = !run.path.comparable ? 'Input/path mismatch' : !run.functional ? 'Functional failure' : 'Runtime/visibility/buffer failure';
  run.classification = run.valid ? 'valid' : 'product-or-input-result';
}
try {
  for (const spec of schedule) {
    const run = { ...spec, startedAt: new Date().toISOString(), valid: false, inputs: [], errors: [], assets: [] };
    const context = await browser.newContext({ viewport: protocol.viewport, deviceScaleFactor: 2 });
    await context.addCookies(cookies);
    let watchdog;
    try {
      await Promise.race([execute(context, spec, run), new Promise((_, reject) => { watchdog = setTimeout(() => reject(Error('External watchdog 90s')), 90000); })]);
    } catch (error) { run.failure = error.message; run.classification = run.failure.startsWith('External watchdog') ? 'timeout-product-or-browser' : run.probe ? 'product-result' : 'preparation-or-automation-failure'; }
    finally {
      clearTimeout(watchdog);
      run.finishedAt = new Date().toISOString();
      writeFileSync(path.join(output, 'raw', `${spec.id}.json`), JSON.stringify(run, null, 2));
      const { probe, inputs, assets, ...record } = run;
      manifest.push(record);
      writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
      await context.close();
      console.log(JSON.stringify({ completed: manifest.length, total: schedule.length, id: spec.id, valid: run.valid, peak: run.path?.peak, clickId: run.probe?.modal?.click.photoId, failure: run.failure }));
    }
    if (!run.probe && phase !== 'main') break;
  }
} finally { await browser.close(); }
if (manifest.some(r => !r.valid) || manifest.length !== schedule.length) process.exitCode = 1;
