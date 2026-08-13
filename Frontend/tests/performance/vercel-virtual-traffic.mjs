import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  assertStagingDependencies,
  validateRunPolicy,
} from './virtual-traffic-policy.mjs';

const readArg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};

const target = readArg('target', 'https://photomap-three.vercel.app/');
const sessions = Number(readArg('sessions', '20'));
const concurrency = Number(readArg('concurrency', '1'));
const seed = Number(readArg('seed', '20260813'));
const output = readArg(
  'output',
  'E:\\memory\\photomap\\characteristic\\2026-08-13-vercel-virtual-traffic.json',
);

const policy = validateRunPolicy({
  target,
  sessions,
  concurrency,
  confirmation: process.env.VIRTUAL_TRAFFIC_CONFIRM,
  declaredStagingHost: process.env.VIRTUAL_TRAFFIC_STAGING_HOST,
});

const deviceProfiles = [
  {
    name: 'mobile-mid-4g',
    weight: 45,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    cpuSlowdown: 4,
    latencyMs: 150,
    downloadMbps: 1.6,
    uploadMbps: 0.75,
  },
  {
    name: 'mobile-low-slow4g',
    weight: 25,
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    cpuSlowdown: 6,
    latencyMs: 300,
    downloadMbps: 0.75,
    uploadMbps: 0.35,
  },
  {
    name: 'desktop-wifi',
    weight: 30,
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    cpuSlowdown: 1,
    latencyMs: 40,
    downloadMbps: 10,
    uploadMbps: 5,
  },
];

const userModel = {
  returningSessionRate: 0.4,
  detailOpenRate: 0.65,
  mapOpenRate: 0.35,
  relationOpenRate: 0.15,
  albumOpenRate: 0.1,
  thinkTimeMs: { min: 500, max: 1500 },
};

function createRandom(initialSeed) {
  let state = initialSeed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const random = createRandom(seed);

function chooseWeighted(items) {
  const point = random() * items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = 0;
  for (const item of items) {
    cursor += item.weight;
    if (point < cursor) return item;
  }
  return items.at(-1);
}

const percentile = (values, fraction) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};

const round = value => value == null ? null : Math.round(value * 10) / 10;

function summarize(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return { count: 0 };
  return {
    count: finite.length,
    minMs: round(Math.min(...finite)),
    p50Ms: round(percentile(finite, 0.5)),
    p75Ms: round(percentile(finite, 0.75)),
    p95Ms: round(percentile(finite, 0.95)),
    p99Ms: round(percentile(finite, 0.99)),
    maxMs: round(Math.max(...finite)),
    meanMs: round(finite.reduce((sum, value) => sum + value, 0) / finite.length),
  };
}

function sanitizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
}

async function applyDeviceConditions(context, page, profile) {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latencyMs,
    downloadThroughput: profile.downloadMbps * 1_000_000 / 8,
    uploadThroughput: profile.uploadMbps * 1_000_000 / 8,
    connectionType: profile.isMobile ? 'cellular4g' : 'wifi',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
}

async function waitForImage(locator, timeout = 30_000) {
  await locator.waitFor({ state: 'attached', timeout });
  return locator.evaluate((image, timeoutMs) => new Promise(resolve => {
    const finish = () => resolve({
      at: performance.now(),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    });
    if (image.complete) return finish();
    const timer = window.setTimeout(finish, timeoutMs);
    const done = () => {
      window.clearTimeout(timer);
      finish();
    };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
  }), timeout);
}

const webVitalsInit = () => {
  window.__PHOTOMAP_VIRTUAL_TRAFFIC__ = { cls: 0, lcp: 0, interactions: [] };
  const state = window.__PHOTOMAP_VIRTUAL_TRAFFIC__;
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) state.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) state.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) state.interactions.push(entry.duration);
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch {
    state.observerUnavailable = true;
  }
};

async function think() {
  const span = userModel.thinkTimeMs.max - userModel.thinkTimeMs.min;
  await new Promise(resolve => setTimeout(
    resolve,
    Math.round(userModel.thinkTimeMs.min + random() * span),
  ));
}

async function runNavigation(page, name, completionLocator) {
  const startedAt = await page.evaluate(() => performance.now());
  await page.getByRole('button', { name, exact: true }).click({ timeout: 5_000 });
  await completionLocator().waitFor({ state: 'visible', timeout: 30_000 });
  return (await page.evaluate(() => performance.now())) - startedAt;
}

async function preflight(browser) {
  const observedUrls = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('request', request => observedUrls.push(request.url()));
  await page.goto(policy.target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 });
  await context.close();
  assertStagingDependencies({ mode: policy.mode, observedUrls });
  return {
    observedSupabaseHosts: [...new Set(observedUrls
      .filter(url => url.includes('.supabase.co'))
      .map(url => new URL(url).hostname))],
  };
}

async function runSession(browser, sessionNumber) {
  const profile = chooseWeighted(deviceProfiles);
  const returning = random() < userModel.returningSessionRate;
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: profile.deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.addInitScript(webVitalsInit);
  await applyDeviceConditions(context, page, profile);

  const sample = {
    session: sessionNumber,
    profile: profile.name,
    returning,
    actions: {},
    errors: [],
    httpErrors: [],
    requestFailures: [],
    requests: 0,
    transferredBytes: 0,
  };

  page.on('console', message => {
    if (message.type() === 'error') sample.errors.push(message.text());
  });
  page.on('request', () => { sample.requests += 1; });
  page.on('requestfailed', request => sample.requestFailures.push({
    type: request.resourceType(),
    error: request.failure()?.errorText || 'unknown',
    url: sanitizeUrl(request.url()),
  }));
  page.on('response', response => {
    const length = Number(response.headers()['content-length']);
    if (Number.isFinite(length)) sample.transferredBytes += length;
    if (response.status() >= 400) sample.httpErrors.push({
      status: response.status(),
      url: sanitizeUrl(response.url()),
    });
  });

  try {
    if (returning) {
      await page.goto(policy.target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await waitForImage(page.locator('main img').first());
    }

    await page.goto(policy.target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    const primaryImage = await waitForImage(page.locator('main img').first());
    sample.actions.primaryImageMs = round(primaryImage.at);
    sample.actions.primaryImageSuccess = primaryImage.naturalWidth > 0;
    await think();

    if (random() < userModel.detailOpenRate) {
      const startedAt = await page.evaluate(() => performance.now());
      await page.locator('main img').first().click({ timeout: 10_000 });
      const close = page.getByRole('button', { name: 'Close' }).first();
      await close.waitFor({ state: 'visible', timeout: 10_000 });
      const shellAt = await page.evaluate(() => performance.now());
      const modal = close.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " fixed ")][1]');
      const detailImage = await waitForImage(modal.locator('img').first());
      sample.actions.detailShellMs = round(shellAt - startedAt);
      sample.actions.detailImageMs = round(detailImage.at - startedAt);
      sample.actions.detailImageSuccess = detailImage.naturalWidth > 0;
      await think();
      await close.click();
      await close.waitFor({ state: 'hidden', timeout: 10_000 });
    }

    if (random() < userModel.relationOpenRate) {
      try {
        sample.actions.relationOpenMs = round(await runNavigation(
          page,
          '관계 보기',
          () => page.locator('svg').first(),
        ));
      } catch (error) {
        sample.actions.relationFailure = error.message.split('\n')[0];
      }
    }

    if (random() < userModel.albumOpenRate) {
      try {
        sample.actions.albumOpenMs = round(await runNavigation(
          page,
          '앨범',
          () => page.locator('main'),
        ));
      } catch (error) {
        sample.actions.albumFailure = error.message.split('\n')[0];
      }
    }

    if (random() < userModel.mapOpenRate) {
      if (!policy.allowMap) {
        sample.actions.mapSkipped = 'disabled by production-pilot policy';
      } else {
        try {
          sample.actions.mapOpenMs = round(await runNavigation(
            page,
            '지도',
            () => page.getByTestId('map-photo-preview-list'),
          ));
        } catch (error) {
          sample.actions.mapFailure = error.message.split('\n')[0];
        }
      }
    }

    const vitals = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const state = window.__PHOTOMAP_VIRTUAL_TRAFFIC__;
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
        lcp: state?.lcp ?? null,
        cls: state?.cls ?? null,
        inp: state?.interactions?.length ? Math.max(...state.interactions) : null,
        ttfb: navigation ? navigation.responseStart : null,
      };
    });
    sample.webVitals = Object.fromEntries(
      Object.entries(vitals).map(([key, value]) => [key, round(value)]),
    );
    sample.success = true;
  } catch (error) {
    sample.success = false;
    sample.fatalError = error.message.split('\n')[0];
  }

  await context.close();
  return sample;
}

function aggregate(samples) {
  const actions = key => samples.map(sample => sample.actions[key]).filter(Number.isFinite);
  const vitals = key => samples.map(sample => sample.webVitals?.[key]).filter(Number.isFinite);
  const attempted = key => samples.filter(sample =>
    Number.isFinite(sample.actions[key]) || sample.actions[key.replace(/Ms$/, 'Failure')]);
  const succeeded = key => samples.filter(sample => Number.isFinite(sample.actions[key]));
  const successRate = key => {
    const attempts = attempted(key).length;
    return attempts === 0 ? null : succeeded(key).length / attempts;
  };

  return {
    sessions: samples.length,
    sessionSuccessRate: samples.filter(sample => sample.success).length / samples.length,
    totalRequests: samples.reduce((sum, sample) => sum + sample.requests, 0),
    observedTransferredBytes: samples.reduce((sum, sample) => sum + sample.transferredBytes, 0),
    requestFailureCount: samples.reduce((sum, sample) => sum + sample.requestFailures.length, 0),
    httpErrorCount: samples.reduce((sum, sample) => sum + sample.httpErrors.length, 0),
    consoleErrorCount: samples.reduce((sum, sample) => sum + sample.errors.length, 0),
    latency: {
      primaryImage: summarize(actions('primaryImageMs')),
      detailShell: summarize(actions('detailShellMs')),
      detailImage: summarize(actions('detailImageMs')),
      relationOpen: summarize(actions('relationOpenMs')),
      albumOpen: summarize(actions('albumOpenMs')),
      mapOpen: summarize(actions('mapOpenMs')),
    },
    actionSuccessRate: {
      relationOpen: successRate('relationOpenMs'),
      albumOpen: successRate('albumOpenMs'),
      mapOpen: successRate('mapOpenMs'),
      primaryImage: samples.filter(sample => sample.actions.primaryImageSuccess).length / samples.length,
      detailImage: actions('detailImageMs').length === 0 ? null
        : samples.filter(sample => sample.actions.detailImageSuccess).length / actions('detailImageMs').length,
    },
    webVitals: {
      fcp: summarize(vitals('fcp')),
      lcp: summarize(vitals('lcp')),
      inp: summarize(vitals('inp')),
      cls: summarize(vitals('cls')),
      ttfb: summarize(vitals('ttfb')),
    },
  };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const startedAt = new Date();
const preflightResult = await preflight(browser);
const samples = new Array(sessions);
let nextSession = 0;

await Promise.all(Array.from({ length: concurrency }, async () => {
  while (true) {
    const index = nextSession;
    nextSession += 1;
    if (index >= sessions) return;
    samples[index] = await runSession(browser, index + 1);
  }
}));

await browser.close();
const finishedAt = new Date();
const result = {
  schemaVersion: 1,
  measuredAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationSeconds: round((finishedAt - startedAt) / 1000),
  target: policy.target,
  policy,
  preflight: preflightResult,
  seed,
  deviceProfiles,
  userModel,
  aggregate: aggregate(samples),
  samples,
  limitations: [
    'Synthetic browser traffic, not real-user monitoring.',
    'One physical runner region; network and CPU conditions are emulated.',
    'Observed transferred bytes use Content-Length when available and may be incomplete.',
    'Production pilot disables map traffic and caps sessions/concurrency.',
  ],
};

mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({ output, aggregate: result.aggregate }, null, 2));
