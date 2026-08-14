import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import {
  assertStagingDependencies,
  validateRunPolicy,
} from './virtual-traffic-policy.mjs';

const url = process.env.PHOTOMAP_BASE_URL || 'https://photomap-three.vercel.app/';
const output = process.env.PHOTOMAP_MODAL_OUTPUT
  || path.resolve('..', 'docs', 'performance', 'results', 'image-final.json');
const coldRuns = Number(process.env.PHOTOMAP_COLD_MODAL_RUNS || 20);
const warmRuns = Number(process.env.PHOTOMAP_WARM_MODAL_RUNS || 10);
const warmups = Number(process.env.PHOTOMAP_MODAL_WARMUPS || 5);
const profile = {
  name: 'mobile-mid-4g',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  cpuSlowdown: 4,
  latencyMs: 150,
  downloadBitsPerSecond: 1_600_000,
  uploadBitsPerSecond: 750_000,
};
const require = createRequire(import.meta.url);
const playwrightVersion = require('@playwright/test/package.json').version;

if (![coldRuns, warmRuns, warmups].every(Number.isInteger)
  || coldRuns < 1 || warmRuns < 0 || warmups < 0) {
  throw new Error('Run counts must be non-negative integers and cold runs must be at least 1.');
}

const target = new URL(url);
const policy = validateRunPolicy({
  target: target.origin,
  sessions: coldRuns,
  concurrency: 1,
  confirmation: process.env.VIRTUAL_TRAFFIC_CONFIRM,
  declaredStagingHost: process.env.VIRTUAL_TRAFFIC_STAGING_HOST,
});

const round = value => Math.round(value * 10) / 10;
const percentile = (values, fraction) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const summarize = values => values.length === 0 ? { count: 0 } : {
  count: values.length,
  minMs: round(Math.min(...values)),
  p50Ms: round(percentile(values, 0.5)),
  p75Ms: round(percentile(values, 0.75)),
  p95Ms: round(percentile(values, 0.95)),
  p99Ms: round(percentile(values, 0.99)),
  maxMs: round(Math.max(...values)),
  meanMs: round(values.reduce((sum, value) => sum + value, 0) / values.length),
};
const rate = (successes, attempts) => attempts === 0 ? null : successes / attempts;
const sanitizeUrl = rawUrl => {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
};
const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};
const createContext = browser => browser.newContext({
  viewport: profile.viewport,
  deviceScaleFactor: profile.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
});
const webVitalsInit = () => {
  window.__PHOTOMAP_MODAL_METRICS__ = { lcp: null, cls: 0 };
  const state = window.__PHOTOMAP_MODAL_METRICS__;
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) state.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    state.observerUnavailable = true;
  }
};

const instrument = async page => {
  const session = await page.context().newCDPSession(page);
  const network = {
    requests: 0,
    transferredBytes: 0,
    requestFailures: [],
    httpErrors: [],
    consoleErrors: [],
  };
  const requestUrls = new Map();

  await session.send('Network.enable');
  session.on('Network.requestWillBeSent', event => {
    network.requests += 1;
    requestUrls.set(event.requestId, event.request.url);
  });
  session.on('Network.loadingFinished', event => {
    network.transferredBytes += event.encodedDataLength || 0;
    requestUrls.delete(event.requestId);
  });
  session.on('Network.loadingFailed', event => {
    network.requestFailures.push({
      error: event.errorText,
      canceled: event.canceled || false,
      url: sanitizeUrl(requestUrls.get(event.requestId)),
    });
    requestUrls.delete(event.requestId);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      network.httpErrors.push({ status: response.status(), url: sanitizeUrl(response.url()) });
    }
  });
  page.on('console', message => {
    if (message.type() === 'error') network.consoleErrors.push(message.text());
  });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.downloadBitsPerSecond / 8,
    uploadThroughput: profile.uploadBitsPerSecond / 8,
    connectionType: 'cellular4g',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
  return network;
};

const networkSnapshot = network => ({
  requests: network.requests,
  transferredBytes: Math.round(network.transferredBytes),
  requestFailureCount: network.requestFailures.length,
  httpErrorCount: network.httpErrors.length,
  consoleErrorCount: network.consoleErrors.length,
});

const networkDelta = (before, after) => Object.fromEntries(
  Object.keys(after).map(key => [key, after[key] - before[key]]),
);
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
const primaryPhoto = page => target.searchParams.has('perfImageMode')
  ? page.locator('main img[src*="/performance-fixtures/"]').first()
  : page.locator('main img').first();

const readVitals = page => page.evaluate(() => {
  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByName('first-contentful-paint')[0];
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  const state = window.__PHOTOMAP_MODAL_METRICS__;
  return {
    fcpMs: paint?.startTime ?? null,
    lcpMs: lcpEntries.at(-1)?.startTime ?? state?.lcp ?? null,
    cls: state?.cls ?? null,
    ttfbMs: navigation?.responseStart ?? null,
    observerUnavailable: state?.observerUnavailable || false,
  };
});

const openDetail = async (page, network) => {
  const before = networkSnapshot(network);
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
    imageSuccess: image.complete && image.naturalWidth > 0,
    network: networkDelta(before, networkSnapshot(network)),
  };
  await close.click();
  await close.waitFor({ state: 'hidden', timeout: 10_000 });
  return sample;
};

const preflight = async browser => {
  const observedUrls = [];
  const context = await createContext(browser);
  const page = await context.newPage();
  page.on('request', request => observedUrls.push(request.url()));
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 });
  const title = await page.title();
  await context.close();
  assertStagingDependencies({ mode: policy.mode, observedUrls });
  return {
    status: response?.status() ?? null,
    title,
    observedSupabaseHosts: [...new Set(observedUrls
      .filter(item => item.includes('.supabase.co'))
      .map(item => new URL(item).hostname))],
  };
};

const runCold = async (browser, run) => {
  const context = await createContext(browser);
  const page = await context.newPage();
  await page.addInitScript(webVitalsInit);
  const network = await instrument(page);
  const sample = {
    run,
    success: false,
    primaryImageSuccess: false,
    modalImageSuccess: false,
  };
  try {
    const navigationStarted = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const primary = await waitImage(primaryPhoto(page), 120_000);
    sample.primaryImageMs = Date.now() - navigationStarted;
    sample.primaryImageSuccess = primary.complete && primary.naturalWidth > 0;
    await page.waitForTimeout(100);
    Object.assign(sample, await readVitals(page));
    const modal = await openDetail(page, network);
    sample.shellMs = modal.shellMs;
    sample.modalImageMs = modal.imageMs;
    sample.modalImageSuccess = modal.imageSuccess;
    sample.modalNetwork = modal.network;
    sample.success = sample.primaryImageSuccess && sample.modalImageSuccess;
  } catch (error) {
    sample.error = error.message.split('\n')[0];
  } finally {
    sample.network = {
      ...networkSnapshot(network),
      requestFailures: network.requestFailures,
      httpErrors: network.httpErrors,
      consoleErrors: network.consoleErrors,
    };
    await context.close();
  }
  return sample;
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const startedAt = new Date();
let preflightResult;
const cold = [];
const warm = [];
let browserVersion;
try {
  browserVersion = browser.version();
  preflightResult = await preflight(browser);
  for (let run = 1; run <= coldRuns; run += 1) {
    cold.push(await runCold(browser, run));
    if (run % 10 === 0 || run === coldRuns) {
      console.log(`[cold] ${run}/${coldRuns}`);
    }
  }

  if (warmRuns > 0) {
    const context = await createContext(browser);
    const page = await context.newPage();
    await page.addInitScript(webVitalsInit);
    const network = await instrument(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await waitImage(primaryPhoto(page), 120_000);
    for (let run = 0; run < warmups + warmRuns; run += 1) {
      try {
        const sample = await openDetail(page, network);
        if (run >= warmups) warm.push({ run: run - warmups + 1, ...sample });
      } catch (error) {
        if (run >= warmups) {
          warm.push({
            run: run - warmups + 1,
            imageSuccess: false,
            error: error.message.split('\n')[0],
          });
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const finishedAt = new Date();
const coldPrimarySuccess = cold.filter(item => item.primaryImageSuccess);
const coldModalSuccess = cold.filter(item => item.modalImageSuccess);
const warmSuccess = warm.filter(item => item.imageSuccess);
const sum = (items, select) => items.reduce((total, item) => total + (select(item) || 0), 0);
const result = {
  schemaVersion: 2,
  measuredAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationSeconds: round((finishedAt - startedAt) / 1000),
  url,
  policy,
  preflight: preflightResult,
  profile,
  execution: {
    concurrency: 1,
    coldContextPolicy: 'fresh Chromium browser context per run',
    warmContextPolicy: 'one shared Chromium browser context after warmups',
    coldRuns,
    warmRuns,
    warmups,
  },
  environment: {
    gitCommit: git('rev-parse', 'HEAD'),
    gitBranch: git('branch', '--show-current'),
    gitDirty: Boolean(git('status', '--porcelain')),
    node: process.version,
    playwright: playwrightVersion,
    browser: `Chrome ${browserVersion}`,
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    runnerRegion: 'single physical runner; exact geographic region not independently verified',
  },
  metrics: {
    coldRunSuccessRate: rate(cold.filter(item => item.success).length, cold.length),
    coldPrimaryImage: {
      ...summarize(coldPrimarySuccess.map(item => item.primaryImageMs)),
      failures: cold.length - coldPrimarySuccess.length,
      successRate: rate(coldPrimarySuccess.length, cold.length),
    },
    coldLcp: summarize(cold.map(item => item.lcpMs)),
    coldFcp: summarize(cold.map(item => item.fcpMs)),
    coldTtfb: summarize(cold.map(item => item.ttfbMs)),
    coldCls: summarize(cold.map(item => item.cls)),
    coldShell: summarize(cold.map(item => item.shellMs)),
    coldModalImage: {
      ...summarize(coldModalSuccess.map(item => item.modalImageMs)),
      failures: cold.length - coldModalSuccess.length,
      successRate: rate(coldModalSuccess.length, cold.length),
    },
    coldNetwork: {
      requests: sum(cold, item => item.network?.requests),
      transferredBytes: sum(cold, item => item.network?.transferredBytes),
      requestFailures: sum(cold, item => item.network?.requestFailureCount),
      httpErrors: sum(cold, item => item.network?.httpErrorCount),
      consoleErrors: sum(cold, item => item.network?.consoleErrorCount),
    },
    warmShell: summarize(warm.map(item => item.shellMs)),
    warmModalImage: {
      ...summarize(warmSuccess.map(item => item.imageMs)),
      failures: warm.length - warmSuccess.length,
      successRate: rate(warmSuccess.length, warm.length),
    },
  },
  cold,
  warm,
  limitations: [
    'Synthetic lab measurement, not field RUM or Vercel Speed Insights.',
    'One physical runner; network and CPU conditions are Chrome DevTools Protocol emulation.',
    'LCP is read after primary image completion and may differ from finalized field LCP.',
    'CDP encodedDataLength includes HTTP response headers and excludes browser cache reads.',
    'Concurrency 1 measures repeatability and user latency, not server saturation or capacity.',
  ],
};

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({ output, metrics: result.metrics }, null, 2));
