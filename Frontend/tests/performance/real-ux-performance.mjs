import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadRawRuns, summarizeRuns, writeSummary } from './real-ux-summary.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(currentDir, '../..');

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};

const flag = name => process.argv.includes(`--${name}`);

const target = new URL(arg('target', 'http://127.0.0.1:4173'));
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('real-ux-performance is local-only. Use localhost, 127.0.0.1, or ::1.');
}

const phase = arg('phase', flag('smoke') ? 'smoke' : flag('main') ? 'main' : 'pilot');
if (!['smoke', 'pilot', 'main'].includes(phase)) throw new Error('Expected --phase smoke|pilot|main');

const output = path.resolve(arg('output', path.join(frontendDir, 'benchmark-results', `real-ux-${phase}-${Date.now()}`)));
const seed = Number(arg('seed', '20260910'));
const requestedCounts = arg('counts', '1000,3000').split(',').map(Number);
const requestedCpu = arg('cpu', '1,4').split(',').map(Number);
const requestedCaches = arg('cache', 'warm').split(',');
if (requestedCaches.some(cache => cache !== 'warm')) throw new Error('Only warm is supported: current preparation warms the scroll path and routing disables HTTP cache.');
const requestedScenarios = arg('scenarios', 'scroll,click').split(',');

const pairCounts = { smoke: 1, pilot: 5, main: 100 };
const protocol = {
  phase,
  fixture: 'real',
  target: target.href,
  seed,
  pairsPerCondition: pairCounts[phase],
  counts: requestedCounts,
  cpuSlowdown: requestedCpu,
  cacheConditions: requestedCaches,
  scenarios: requestedScenarios,
  modes: ['all', 'virtual'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  headless: true,
  phaseSmokePairs: 1,
  phasePilotPairs: 5,
  phaseMainPairs: 100,
  primaryMetrics: [
    'scroll LoAF blockingDuration sum',
    'modalReadyMs from in-page uxProbe code-only readiness',
    'paired all - virtual deltas with bootstrap median CI',
  ],
  wheel: { x: 195, y: 422, tickMs: 50, deltaY: 30, scrollMsEachDirection: 10000, clickScrollMs: 10000 },
  warmup: { tickMs: 10, deltaY: 60, scrollMsEachDirection: 10000, settleMs: 400 },
  modalTimeoutMs: 5000,
  externalWatchdogMs: 90000,
  pathTolerancePx: 80,
  clickDelayAfterFinalWheelAckMs: 50,
  timingExclusions: 'No screenshots, video, tracing, locator actionability waits, or full DOM traversal during measured interval.',
  readyMetric: 'uxProbe modal.readyAt: modal exists, matching data-photo-modal-id, image complete, naturalWidth > 0, decode resolved.',
};

function seededRandom(initialSeed) {
  let state = initialSeed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
}

function sha256File(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function directoryHash(dir) {
  if (!existsSync(dir)) return null;
  const hash = createHash('sha256');
  const visit = current => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full).replace(/\\/g, '/');
      hash.update(rel);
      if (entry.isDirectory()) visit(full);
      else hash.update(readFileSync(full));
    }
  };
  visit(dir);
  return hash.digest('hex');
}

function sourceInfo() {
  const git = args => {
    try {
      return execFileSync('git', ['-C', frontendDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return null;
    }
  };
  const files = [
    path.join(currentDir, 'real-ux-performance.mjs'),
    path.join(currentDir, 'real-ux-summary.mjs'),
    path.join(currentDir, 'ux-probe.js'),
    path.join(frontendDir, 'src', 'virtualization-benchmark.tsx'),
    path.join(frontendDir, 'src', 'components', 'PhotoFeed.tsx'),
    path.join(frontendDir, 'src', 'components', 'ui', 'photo-modal.tsx'),
  ].filter(existsSync);
  return {
    commit: git(['rev-parse', 'HEAD']),
    statusShort: git(['status', '--short']),
    measuredFiles: files.map(file => ({ path: path.relative(frontendDir, file).replace(/\\/g, '/'), sha256: sha256File(file) })),
    buildBenchmarkHash: directoryHash(path.join(frontendDir, 'build-benchmark')),
  };
}

function buildSchedule() {
  const random = seededRandom(seed);
  const schedule = [];
  for (const count of requestedCounts) {
    for (const cpuSlowdown of requestedCpu) {
      for (const cacheCondition of requestedCaches) {
        for (const scenario of requestedScenarios) {
          for (let pair = 1; pair <= protocol.pairsPerCondition; pair += 1) {
            const order = random() < 0.5 ? ['all', 'virtual'] : ['virtual', 'all'];
            for (let orderIndex = 0; orderIndex < order.length; orderIndex += 1) {
              const mode = order[orderIndex];
              schedule.push({
                id: `${scenario}-count${count}-cpu${cpuSlowdown}-${cacheCondition}-pair${String(pair).padStart(3, '0')}-${orderIndex + 1}-${mode}`,
                scenario,
                count,
                cpuSlowdown,
                cacheCondition,
                pair,
                order: order.join('/'),
                orderIndex,
                mode,
              });
            }
          }
        }
      }
    }
  }
  return schedule;
}

mkdirSync(path.join(output, 'raw'), { recursive: true });
mkdirSync(path.join(output, 'source'), { recursive: true });
const protocolFile = path.join(output, 'protocol-lock.json');
const scheduleFile = path.join(output, 'schedule.json');
if (!existsSync(protocolFile)) {
  writeFileSync(protocolFile, JSON.stringify(protocol, null, 2));
  writeFileSync(path.join(output, 'protocol.md'), [
    '# PhotoMap Real UX Performance Protocol',
    '',
    `- Phase: ${phase}`,
    `- Target: ${target.href}`,
    '- Fixture: `real`; benchmark URL must use `/virtualization-benchmark.html?mode=all|virtual&count=N&fixture=real`.',
    '- A/B unit: balanced seeded pair; delta direction is `all - virtual`.',
    '- Timing exclusion: screenshots, trace, locator actionability waits, and full DOM traversal are disabled during measured intervals.',
    '- Modal ready metric is code-only `uxProbe.modal.readyAt`; visual display still requires separate camera/capture evidence.',
    '- Failures, invalids, and preparation errors are preserved in `raw/` and included in denominator summaries.',
    '',
  ].join('\n'));
}
if (!existsSync(scheduleFile)) writeFileSync(scheduleFile, JSON.stringify(buildSchedule(), null, 2));
const lockedProtocol = JSON.parse(readFileSync(protocolFile, 'utf8'));
const schedule = JSON.parse(readFileSync(scheduleFile, 'utf8'));

const fixtureManifestPath = path.join(frontendDir, 'public', 'real-fixtures', 'v1', 'fixture-manifest.json');
if (!existsSync(fixtureManifestPath)) {
  throw new Error(`Missing real fixture manifest: ${fixtureManifestPath}`);
}
const fixtureManifest = JSON.parse(readFileSync(fixtureManifestPath, 'utf8'));
if (!Array.isArray(fixtureManifest.fixtures) || fixtureManifest.fixtures.length !== 1000) {
  throw new Error('Real fixture requires exactly 1000 manifest fixtures');
}
writeFileSync(path.join(output, 'fixture-manifest.json'), JSON.stringify({
  source: path.relative(frontendDir, fixtureManifestPath).replace(/\\/g, '/'),
  sha256: sha256File(fixtureManifestPath),
  entries: fixtureManifest.fixtures.length,
  manifest: fixtureManifest,
}, null, 2));
writeFileSync(path.join(output, 'source', 'source-info.json'), JSON.stringify(sourceInfo(), null, 2));

const browser = await chromium.launch({ headless: true });
writeFileSync(path.join(output, 'environment.json'), JSON.stringify({
  target: target.href,
  startedAt: new Date().toISOString(),
  browser: browser.version(),
  os: `${os.type()} ${os.release()}`,
  cpu: os.cpus()[0]?.model,
  logicalCpuCount: os.cpus().length,
  ramBytes: os.totalmem(),
  viewport: lockedProtocol.viewport,
  deviceScaleFactor: lockedProtocol.deviceScaleFactor,
  browserCache: 'fresh context per run; Playwright routing disables HTTP cache on measured page; warm means prepared images on the measured scroll path',
  network: 'local localhost only; no artificial throttling in this runner',
}, null, 2));

async function snapshot(page) {
  return page.locator('[data-benchmark-feed]').evaluate(el => {
    const bounds = el.getBoundingClientRect();
    const cards = [...el.querySelectorAll('[data-photo-id]')];
    const visible = cards.filter(card => {
      const rect = card.getBoundingClientRect();
      return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right;
    });
    return {
      at: performance.now(),
      top: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      loaded: Number(el.dataset.loadedCount),
      filtered: Number(el.dataset.filteredCount),
      columns: Number(el.dataset.columns),
      rowCount: Number(el.dataset.rowCount),
      cards: cards.length,
      visibleIds: visible.map(card => card.dataset.photoId),
      ready: visible.length > 0 && visible.every(card => {
        const image = card.querySelector('img');
        return image?.complete && image.naturalWidth > 0 && !image.dataset.originalUrl;
      }),
      modalClosed: !document.querySelector('[data-photo-modal-id]'),
      selectedPhotoId: el.dataset.selectedPhotoId ?? null,
      visibility: document.visibilityState,
    };
  });
}

async function settle(page) {
  let previous = '';
  let stable = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await sleep(100);
    const state = await snapshot(page);
    const key = JSON.stringify([state.top, state.scrollHeight, state.cards, state.visibleIds]);
    stable = state.ready && key === previous ? stable + 1 : 0;
    previous = key;
    if (stable >= 3) return state;
  }
  throw new Error('Preparation layout/image timeout');
}

async function wheel(cdp, protocolWheel, deltaY, durationMs, inputs, label) {
  const origin = performance.now();
  const count = Math.round(durationMs / protocolWheel.tickMs);
  for (let index = 0; index < count; index += 1) {
    const plannedAt = origin + index * protocolWheel.tickMs;
    await sleep(Math.max(0, plannedAt - performance.now()));
    const sentAt = performance.now();
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: protocolWheel.x,
      y: protocolWheel.y,
      deltaX: 0,
      deltaY,
    });
    inputs?.push({ label, index, deltaY, plannedAt, sentAt, ackAt: performance.now() });
  }
  await sleep(Math.max(0, origin + durationMs - performance.now()));
}

async function pageAtPointPhotoId(page) {
  return page.evaluate(({ x, y }) => {
    const element = document.elementFromPoint(x, y);
    return element?.closest?.('[data-photo-id]')?.dataset.photoId ?? null;
  }, { x: lockedProtocol.wheel.x, y: lockedProtocol.wheel.y });
}

function benchmarkUrl(spec) {
  const url = new URL('/virtualization-benchmark.html', target);
  url.search = new URLSearchParams({ mode: spec.mode, count: String(spec.count), fixture: 'real' }).toString();
  return url.href;
}

async function prepareExpectedClick(context, spec) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: spec.cpuSlowdown });
  await page.goto(benchmarkUrl(spec), { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page);
  await wheel(cdp, lockedProtocol.wheel, lockedProtocol.wheel.deltaY, lockedProtocol.wheel.clickScrollMs, null, 'expected-click');
  await settle(page);
  const expectedClickId = await pageAtPointPhotoId(page);
  await wheel(cdp, lockedProtocol.wheel, -lockedProtocol.wheel.deltaY, lockedProtocol.wheel.clickScrollMs, null, 'expected-return');
  await page.close();
  if (!expectedClickId) throw new Error('Warmup could not determine fixed click target ID');
  return expectedClickId;
}

async function prewarmCache(context, spec) {
  const page = await context.newPage();
  await page.goto(benchmarkUrl(spec), { waitUntil: 'networkidle', timeout: 60000 });
  await settle(page);
  await page.close();
}

async function executeRun(context, spec, run) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: spec.cpuSlowdown });
  page.on('crash', () => { run.crashed = true; });
  page.on('pageerror', error => run.errors.push({ type: 'runtime', message: error.message }));
  page.on('requestfailed', request => run.errors.push({ type: 'request', url: request.url(), message: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 400) run.errors.push({ type: 'http', status: response.status(), path: new URL(response.url()).pathname });
  });
  await page.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === target.origin || ['data:', 'blob:'].includes(requestUrl.protocol)) return route.continue();
    run.errors.push({ type: 'external-request', origin: requestUrl.origin, url: route.request().url() });
    return route.abort();
  });

  const expectedClickId = spec.scenario === 'click' ? await prepareExpectedClick(context, spec) : null;
  run.expectedClickId = expectedClickId;
  await page.goto(benchmarkUrl(spec), { waitUntil: 'networkidle', timeout: 60000 });
  run.initial = await settle(page);
  if (run.initial.loaded !== spec.count || run.initial.filtered !== spec.count) throw new Error('Fixture count mismatch');
  if (!run.initial.modalClosed || run.initial.visibility !== 'visible') throw new Error('Invalid initial benchmark state');

  run.warmup = { start: performance.now() };
  await wheel(cdp, lockedProtocol.warmup, lockedProtocol.warmup.deltaY, lockedProtocol.warmup.scrollMsEachDirection, null, 'warm-down');
  await wheel(cdp, lockedProtocol.warmup, -lockedProtocol.warmup.deltaY, lockedProtocol.warmup.scrollMsEachDirection, null, 'warm-up');
  run.prepared = await settle(page);
  run.warmup.end = performance.now();
  if (run.prepared.top > 1) throw new Error('Warmup did not return to top');

  await page.addScriptTag({ path: path.join(currentDir, 'ux-probe.js') });
  await page.evaluate(() => window.uxProbe.start(true));
  await page.evaluate(() => window.uxProbe.mark('idleStart'));
  await sleep(2000);
  await page.evaluate(() => window.uxProbe.mark('scrollStart'));
  run.externalStart = performance.now();

  if (spec.scenario === 'scroll') {
    await wheel(cdp, lockedProtocol.wheel, lockedProtocol.wheel.deltaY, lockedProtocol.wheel.scrollMsEachDirection, run.inputs, 'down');
    await page.evaluate(() => window.uxProbe.mark('turn'));
    await wheel(cdp, lockedProtocol.wheel, -lockedProtocol.wheel.deltaY, lockedProtocol.wheel.scrollMsEachDirection, run.inputs, 'up');
  } else {
    await wheel(cdp, lockedProtocol.wheel, lockedProtocol.wheel.deltaY, lockedProtocol.wheel.clickScrollMs, run.inputs, 'down-click-target');
  }

  run.externalEnd = performance.now();
  await page.evaluate(() => window.uxProbe.mark('scrollEnd'));

  if (spec.scenario === 'click') {
    const finalAck = run.inputs.at(-1).ackAt;
    await sleep(Math.max(0, finalAck + lockedProtocol.clickDelayAfterFinalWheelAckMs - performance.now()));
    run.pointer = { plannedAt: finalAck + lockedProtocol.clickDelayAfterFinalWheelAckMs, pressSentAt: performance.now() };
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: lockedProtocol.wheel.x, y: lockedProtocol.wheel.y, button: 'left', clickCount: 1 });
    run.pointer.releaseSentAt = performance.now();
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: lockedProtocol.wheel.x, y: lockedProtocol.wheel.y, button: 'left', clickCount: 1 });
    run.pointer.ackAt = performance.now();
    await page.waitForFunction(() => window.uxProbe.modalStatus()?.readyAt || window.uxProbe.modalStatus()?.timedOut, null, { timeout: lockedProtocol.modalTimeoutMs + 500, polling: 100 }).catch(() => {});
    await sleep(1000);
  }

  await sleep(1000);
  await page.evaluate(() => window.uxProbe.mark('recoveryEnd'));
  await sleep(300);
  run.probe = await page.evaluate(() => window.uxProbe.finish());
  run.final = await snapshot(page);

  if (spec.scenario === 'click') {
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('[data-photo-modal-id]').click({ position: { x: 4, y: 4 }, timeout: 1000 }).catch(() => {});
    run.afterClose = await snapshot(page).catch(error => ({ error: error.message }));
  }

  const scrollTops = run.probe.scroll
    .filter(sample => sample.at >= run.probe.marks.scrollStart && sample.at <= run.probe.marks.scrollEnd)
    .map(sample => sample.top);
  const expectedPeak = spec.scenario === 'scroll'
    ? lockedProtocol.wheel.deltaY * Math.round(lockedProtocol.wheel.scrollMsEachDirection / lockedProtocol.wheel.tickMs)
    : lockedProtocol.wheel.deltaY * Math.round(lockedProtocol.wheel.clickScrollMs / lockedProtocol.wheel.tickMs);
  run.path = {
    expectedPeak,
    peak: Math.max(run.prepared.top, ...scrollTops),
    end: run.final.top,
    eventCount: run.inputs.length,
    expectedEvents: spec.scenario === 'scroll'
      ? Math.round(lockedProtocol.wheel.scrollMsEachDirection / lockedProtocol.wheel.tickMs) * 2
      : Math.round(lockedProtocol.wheel.clickScrollMs / lockedProtocol.wheel.tickMs),
    maxSendLatenessMs: Math.max(0, ...run.inputs.map(input => input.sentAt - input.plannedAt)),
  };
  run.path.comparable = Math.abs(run.path.peak - run.path.expectedPeak) <= lockedProtocol.pathTolerancePx &&
    run.path.eventCount === run.path.expectedEvents &&
    (spec.scenario !== 'scroll' || Math.abs(run.path.end) <= 1);

  run.functional = spec.scenario === 'scroll'
    ? run.final.ready
    : Boolean(run.probe.modal?.readyAt) &&
      run.probe.modal.click.photoId === run.expectedClickId &&
      run.probe.modal.modalId === run.expectedClickId &&
      run.probe.finalSelection === run.expectedClickId;
  run.valid = run.path.comparable &&
    run.functional &&
    run.probe.initialVisibility === 'visible' &&
    run.probe.finalVisibility === 'visible' &&
    run.probe.visibility.length === 0 &&
    !run.probe.overflow &&
    run.errors.length === 0;
  if (!run.valid) run.failure = !run.path.comparable ? 'Input/path mismatch' : !run.functional ? 'Functional failure' : 'Runtime/visibility/buffer failure';
}

try {
  for (const spec of schedule) {
    const rawFile = path.join(output, 'raw', `${spec.id}.json`);
    if (existsSync(rawFile)) {
      console.log(JSON.stringify({ skipped: spec.id, reason: 'raw file exists' }));
      continue;
    }

    const run = { ...spec, startedAt: new Date().toISOString(), valid: false, inputs: [], errors: [] };
    const context = await browser.newContext({
      viewport: lockedProtocol.viewport,
      deviceScaleFactor: lockedProtocol.deviceScaleFactor,
      serviceWorkers: 'block',
    });
    let watchdog;
    try {
      if (spec.cacheCondition === 'warm') await prewarmCache(context, spec);
      await Promise.race([
        executeRun(context, spec, run),
        new Promise((_, reject) => {
          watchdog = setTimeout(() => reject(new Error(`External watchdog ${lockedProtocol.externalWatchdogMs}ms`)), lockedProtocol.externalWatchdogMs);
        }),
      ]);
    } catch (error) {
      run.failure = error.message;
      run.invalidReason = run.failure;
      run.classification = run.probe ? 'product-result' : 'preparation-or-automation-failure';
    } finally {
      clearTimeout(watchdog);
      run.finishedAt = new Date().toISOString();
      writeFileSync(rawFile, JSON.stringify(run, null, 2));
      await context.close();
      console.log(JSON.stringify({ id: spec.id, valid: run.valid, failure: run.failure ?? null, clickId: run.probe?.modal?.click?.photoId ?? null }));
    }
  }
} finally {
  await browser.close();
}

const summary = summarizeRuns(loadRawRuns(output));
writeSummary(output, summary);
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({
  protocol: 'protocol-lock.json',
  schedule: 'schedule.json',
  environment: 'environment.json',
  fixtureManifest: 'fixture-manifest.json',
  rawRuns: summary.metrics.length,
  validRuns: summary.metrics.filter(metric => metric.valid).length,
  finishedAt: new Date().toISOString(),
}, null, 2));

if (summary.metrics.some(metric => !metric.valid)) process.exitCode = 1;
