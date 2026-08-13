import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.env.PHOTOMAP_BASE_URL || 'https://photomap-three.vercel.app/';
const output = process.env.PHOTOMAP_USABILITY_OUTPUT
  || 'E:\\memory\\photomap\\characteristic\\2026-08-13-vercel-mobile-usability.json';
const coldRuns = Number(process.env.PHOTOMAP_COLD_RUNS || 20);
const modalRuns = Number(process.env.PHOTOMAP_MODAL_RUNS || 50);
const profile = {
  viewport: { width: 390, height: 844 },
  cpuSlowdown: 4,
  latencyMs: 150,
  downloadBitsPerSecond: 1_600_000,
  uploadBitsPerSecond: 750_000,
};

const round = value => Math.round(value * 10) / 10;
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const summarize = values => values.length === 0 ? { count: 0 } : {
  count: values.length,
  minMs: round(Math.min(...values)),
  p50Ms: round(percentile(values, 0.5)),
  p95Ms: round(percentile(values, 0.95)),
  p99Ms: round(percentile(values, 0.99)),
  maxMs: round(Math.max(...values)),
  meanMs: round(values.reduce((sum, value) => sum + value, 0) / values.length),
};
const sanitize = raw => {
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
};
const createContext = browser => browser.newContext({
  viewport: profile.viewport,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const throttle = async page => {
  const session = await page.context().newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.downloadBitsPerSecond / 8,
    uploadThroughput: profile.uploadBitsPerSecond / 8,
    connectionType: 'cellular4g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
};
const waitImage = async (locator, timeout = 20_000) => {
  await locator.waitFor({ state: 'attached', timeout });
  return locator.evaluate((image, timeoutMs) => new Promise(resolve => {
    const finish = () => resolve({
      at: performance.now(),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    });
    if (image.complete) return finish();
    const timer = setTimeout(finish, timeoutMs);
    const done = () => {
      clearTimeout(timer);
      finish();
    };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
  }), timeout);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const failures = [];
const listen = (page, phase) => page.on('requestfailed', request => failures.push({
  phase,
  type: request.resourceType(),
  error: request.failure()?.errorText || 'unknown',
  url: sanitize(request.url()),
}));

const coldSamples = [];
for (let run = 1; run <= coldRuns; run += 1) {
  const context = await createContext(browser);
  const page = await context.newPage();
  await throttle(page);
  listen(page, 'cold-home');
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const image = await waitImage(page.locator('main img').first());
    coldSamples.push({ run, readyMs: round(image.at), success: image.naturalWidth > 0 });
  } catch (error) {
    coldSamples.push({ run, success: false, error: error.message });
  }
  await context.close();
}

const context = await createContext(browser);
const page = await context.newPage();
await throttle(page);
listen(page, 'warm-interaction');
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
await waitImage(page.locator('main img').first());

const modalShell = [];
const modalImage = [];
let modalFailures = 0;
for (let run = 0; run < modalRuns; run += 1) {
  try {
    const started = await page.evaluate(() => performance.now());
    await page.locator('main img').first().click();
    const close = page.getByRole('button', { name: 'Close' }).first();
    await close.waitFor({ state: 'visible', timeout: 10_000 });
    const shellAt = await page.evaluate(() => performance.now());
    const image = await waitImage(page.locator('div.fixed.inset-0 img').first());
    modalShell.push(shellAt - started);
    if (image.naturalWidth > 0) modalImage.push(image.at - started);
    else modalFailures += 1;
    await close.click();
    await close.waitFor({ state: 'hidden', timeout: 10_000 });
  } catch {
    modalFailures += 1;
    await page.keyboard.press('Escape').catch(() => {});
  }
}

const mapButton = page.getByRole('button', { name: '지도', exact: true });
const mapButtonBox = await mapButton.boundingBox();
const mapNavigationUsable = Boolean(mapButtonBox
  && mapButtonBox.x >= 0
  && mapButtonBox.y >= 0
  && mapButtonBox.x + mapButtonBox.width <= profile.viewport.width
  && mapButtonBox.y + mapButtonBox.height <= profile.viewport.height);

await context.close();
await browser.close();

const successfulCold = coldSamples.filter(sample => sample.success).map(sample => sample.readyMs);
const groupedFailures = Object.values(failures.reduce((groups, failure) => {
  const key = `${failure.phase}|${failure.type}|${failure.error}|${failure.url}`;
  groups[key] ||= { ...failure, count: 0 };
  groups[key].count += 1;
  return groups;
}, {})).sort((a, b) => b.count - a.count);
const result = {
  measuredAt: new Date().toISOString(),
  url,
  profile,
  samples: { coldRuns, modalRuns },
  metrics: {
    coldHomePrimaryImage: {
      ...summarize(successfulCold),
      failures: coldSamples.length - successfulCold.length,
      successRate: successfulCold.length / coldSamples.length,
    },
    modalShell: { ...summarize(modalShell), failures: modalRuns - modalShell.length },
    modalImage: { ...summarize(modalImage), failures: modalFailures },
    mobileMapNavigation: {
      usable: mapNavigationUsable,
      buttonBox: mapButtonBox,
      viewport: profile.viewport,
    },
  },
  coldSamples,
  requestFailures: groupedFailures,
  limitations: [
    'Synthetic lab measurement, not field RUM.',
    'Warm modal samples reuse browser cache and application session.',
    'Map latency is unavailable when navigation is outside the mobile viewport.',
  ],
};

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({ output, metrics: result.metrics }, null, 2));
