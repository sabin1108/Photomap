import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const url = process.env.PHOTOMAP_BASE_URL || 'https://photomap-three.vercel.app/';
const output = process.env.PHOTOMAP_MODAL_OUTPUT
  || 'E:\\memory\\photomap\\characteristic\\2026-08-13-vercel-modal-usability.json';
const coldRuns = Number(process.env.PHOTOMAP_COLD_MODAL_RUNS || 20);
const warmRuns = Number(process.env.PHOTOMAP_WARM_MODAL_RUNS || 50);
const warmups = 5;
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
const waitImage = async (locator, timeout = 30_000) => {
  await locator.waitFor({ state: 'attached', timeout });
  const deadline = Date.now() + timeout;
  let state = { at: 0, naturalWidth: 0, complete: false };
  while (Date.now() < deadline) {
    state = await locator.evaluate(image => ({
      at: performance.now(),
      naturalWidth: image.naturalWidth,
      complete: image.complete,
    }));
    if (state.complete) return state;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return state;
};
const primaryPhoto = page => url.includes('perf-image-delivery')
  ? page.locator('main img[src*="/performance-fixtures/"]').first()
  : page.locator('main img').first();
const openDetail = async page => {
  const started = await page.evaluate(() => performance.now());
  await primaryPhoto(page).click();
  const close = page.getByRole('button', { name: 'Close' }).first();
  await close.waitFor({ state: 'visible', timeout: 10_000 });
  const shellAt = await page.evaluate(() => performance.now());
  const modal = close.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " fixed ")][1]');
  const image = await waitImage(modal.locator('img').first());
  const sample = {
    shellMs: round(shellAt - started),
    imageMs: round(image.at - started),
    imageSuccess: image.naturalWidth > 0,
  };
  await close.click();
  await close.waitFor({ state: 'hidden', timeout: 10_000 });
  return sample;
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cold = [];
for (let run = 1; run <= coldRuns; run += 1) {
  const context = await createContext(browser);
  const page = await context.newPage();
  await throttle(page);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitImage(primaryPhoto(page), 120_000);
    cold.push({ run, ...(await openDetail(page)) });
  } catch (error) {
    cold.push({ run, imageSuccess: false, error: error.message });
  }
  await context.close();
}

const context = await createContext(browser);
const page = await context.newPage();
await throttle(page);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
await waitImage(primaryPhoto(page), 120_000);
const warm = [];
for (let run = 0; run < warmups + warmRuns; run += 1) {
  const sample = await openDetail(page);
  if (run >= warmups) warm.push({ run: run - warmups + 1, ...sample });
}
await context.close();
await browser.close();

const coldSuccess = cold.filter(item => item.imageSuccess);
const warmSuccess = warm.filter(item => item.imageSuccess);
const result = {
  measuredAt: new Date().toISOString(),
  url,
  profile,
  samples: { coldRuns, warmRuns, warmups },
  metrics: {
    coldShell: summarize(cold.map(item => item.shellMs).filter(Number.isFinite)),
    coldImage: {
      ...summarize(coldSuccess.map(item => item.imageMs)),
      failures: cold.length - coldSuccess.length,
      successRate: coldSuccess.length / cold.length,
    },
    warmShell: summarize(warm.map(item => item.shellMs).filter(Number.isFinite)),
    warmImage: {
      ...summarize(warmSuccess.map(item => item.imageMs)),
      failures: warm.length - warmSuccess.length,
      successRate: warmSuccess.length / warm.length,
    },
  },
  cold,
  warm,
  limitations: [
    'Synthetic lab measurement, not field RUM.',
    'Cold samples use a fresh browser context; warm samples reuse cache and session.',
  ],
};

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({ output, metrics: result.metrics }, null, 2));
