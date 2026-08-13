import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { validateRunPolicy } from './virtual-traffic-policy.mjs';

const readArg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};

const target = readArg('target', 'https://photomap-three.vercel.app/');
const sessions = Number(readArg('sessions', '20'));
const concurrency = Number(readArg('concurrency', '1'));
const output = readArg(
  'output',
  'E:\\memory\\photomap\\characteristic\\2026-08-13-vercel-navigation-traffic.json',
);
const policy = validateRunPolicy({
  target,
  sessions,
  concurrency,
  confirmation: process.env.VIRTUAL_TRAFFIC_CONFIRM,
  declaredStagingHost: process.env.VIRTUAL_TRAFFIC_STAGING_HOST,
});

const profiles = [
  { name: 'mobile-mid-4g', viewport: { width: 390, height: 844 }, mobile: true, cpu: 4, latency: 150, down: 1.6, up: 0.75 },
  { name: 'mobile-low-slow4g', viewport: { width: 360, height: 800 }, mobile: true, cpu: 6, latency: 300, down: 0.75, up: 0.35 },
  { name: 'desktop-wifi', viewport: { width: 1440, height: 900 }, mobile: false, cpu: 1, latency: 40, down: 10, up: 5 },
];
const actions = [
  { name: '관계 보기', completion: page => page.getByRole('heading', { name: '공간 관계 보기' }) },
  { name: '앨범', completion: page => page.getByText('위치와 카테고리별로 사진을 탐색합니다.', { exact: false }) },
];

const round = value => Math.round(value * 10) / 10;
const percentile = (values, fraction) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const summarize = values => values.length === 0 ? { count: 0 } : {
  count: values.length,
  p50Ms: round(percentile(values, 0.5)),
  p75Ms: round(percentile(values, 0.75)),
  p95Ms: round(percentile(values, 0.95)),
  maxMs: round(Math.max(...values)),
};

async function applyConditions(context, page, profile) {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: profile.latency,
    downloadThroughput: profile.down * 1_000_000 / 8,
    uploadThroughput: profile.up * 1_000_000 / 8,
    connectionType: profile.mobile ? 'cellular4g' : 'wifi',
  });
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
}

async function openNavigation(page, action) {
  const button = page.getByRole('button', { name: action.name, exact: true });
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  const outside = !box || !viewport || box.x < 0 || box.y < 0
    || box.x + box.width > viewport.width || box.y + box.height > viewport.height;
  let menuOpenMs = null;
  if (outside) {
    const menuStarted = await page.evaluate(() => performance.now());
    await page.getByRole('button', { name: '메뉴 열기' }).click({ timeout: 5_000 });
    await button.waitFor({ state: 'visible', timeout: 5_000 });
    menuOpenMs = (await page.evaluate(() => performance.now())) - menuStarted;
  }
  const started = await page.evaluate(() => performance.now());
  await button.click({ timeout: 5_000 });
  await action.completion(page).waitFor({ state: 'visible', timeout: 30_000 });
  return {
    menuOpenMs: menuOpenMs == null ? null : round(menuOpenMs),
    navigationMs: round((await page.evaluate(() => performance.now())) - started),
  };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const samples = [];
for (let index = 0; index < sessions; index += 1) {
  const profile = profiles[index % profiles.length];
  const action = actions[index % actions.length];
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    deviceScaleFactor: profile.mobile ? 2 : 1,
  });
  const page = await context.newPage();
  await applyConditions(context, page, profile);
  const sample = { session: index + 1, profile: profile.name, action: action.name };
  try {
    await page.goto(policy.target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 });
    Object.assign(sample, await openNavigation(page, action));
    sample.success = true;
  } catch (error) {
    sample.success = false;
    sample.error = error.message.split('\n')[0];
  }
  samples.push(sample);
  await context.close();
}
await browser.close();

const aggregate = Object.fromEntries(actions.map(action => {
  const selected = samples.filter(sample => sample.action === action.name);
  const success = selected.filter(sample => sample.success);
  return [action.name, {
    attempts: selected.length,
    successRate: success.length / selected.length,
    navigation: summarize(success.map(sample => sample.navigationMs)),
    mobileMenuOpen: summarize(success.map(sample => sample.menuOpenMs).filter(Number.isFinite)),
  }];
}));

const result = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  target: policy.target,
  policy,
  profiles,
  aggregate,
  samples,
  limitations: [
    'Synthetic browser traffic, not real-user monitoring.',
    'Production pilot is sequential and capped at 20 sessions.',
  ],
};
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify({ output, aggregate }, null, 2));
