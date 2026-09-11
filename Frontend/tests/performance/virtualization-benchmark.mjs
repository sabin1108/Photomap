import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const arg = (name, fallback) => process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : fallback;
const target = arg('target', '');
const local = process.argv.includes('--smoke');
const pilot = process.argv.includes('--pilot');
const shortRun = local || pilot;
const url = new URL(target);
if (!local && (!url.hostname.endsWith('.vercel.app') || !arg('deployment-id', ''))) throw new Error('Fixed Vercel deployment URL and --deployment-id required');
const output = path.resolve(arg('output', 'benchmark-results/virtualization'));
mkdirSync(path.join(output, 'screenshots'), { recursive: true });
const runs = [];
const browser = await chromium.launch({ headless: true });
writeFileSync(path.join(output, 'environment.json'), JSON.stringify({ target, deploymentId: arg('deployment-id', null), sourceCommit: arg('commit', null), startedAt: new Date().toISOString(), browser: browser.version(), headless: true, os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model, ramBytes: os.totalmem(), concurrency: 1, cpuSlowdown: 1, networkThrottling: false, browserCache: 'fresh context per run', cdnCache: 'not cleared', sampleIntervalMs: 100, localSmokeOnly: local, pilot, imageCondition: 'same-origin synthetic static images', repetitions: shortRun ? 1 : 3 }, null, 2));

async function snapshot(page) {
  return page.locator('[data-benchmark-feed]').evaluate(el => {
    const cards = [...el.querySelectorAll('[data-photo-id]')];
    const bounds = el.getBoundingClientRect();
    const visible = cards.filter(card => { const r = card.getBoundingClientRect(); return r.bottom > bounds.top && r.top < bounds.bottom && r.right > bounds.left && r.left < bounds.right; });
    return { sampledAtMs: performance.now(), loaded: Number(el.dataset.loadedCount), filtered: Number(el.dataset.filteredCount), columns: Number(el.dataset.columns), totalRows: Number(el.dataset.rowCount), renderedRows: el.querySelectorAll('[data-index]').length, cards: new Set(cards.map(c => c.dataset.photoId)).size, elements: el.querySelectorAll('*').length, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop, visibleIds: visible.map(c => c.dataset.photoId), visibleImagesReady: visible.every(c => { const i = c.querySelector('img'); return i?.complete && i.naturalWidth > 0 && !i.dataset.originalUrl; }) };
  });
}
async function settle(page) {
  let prior = '';
  let stable = 0;
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(100);
    const s = await snapshot(page);
    const key = JSON.stringify([s.scrollHeight, s.scrollTop, s.cards, s.visibleIds]);
    stable = key === prior && s.visibleImagesReady ? stable + 1 : 0;
    if (stable >= 3) return s;
    prior = key;
  }
  throw new Error('Layout/images failed to stabilize within 10 seconds');
}
try {
  for (const count of shortRun ? [1000] : [1000, 3000]) for (const profile of [{ name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }, { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }]) for (let repeat = 0; repeat < (shortRun ? 1 : 3); repeat++) for (const mode of ['all', 'virtual']) {
    const id = `${profile.name}-${count}-${repeat + 1}-${mode}`;
    const run = { id, count, profile, mode, startedAt: new Date().toISOString(), samples: [], errors: [], responses: [], valid: false };
    const context = await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: profile.deviceScaleFactor });
    const cookieFile = process.env.VERCEL_BENCHMARK_COOKIE_FILE;
    if (cookieFile) {
      const cookies = readFileSync(cookieFile, 'utf8').split(/\r?\n/).filter(line => line && (!line.startsWith('#') || line.startsWith('#HttpOnly_'))).map(line => {
        const [domain, , cookiePath, secure, expires, name, value] = line.replace(/^#HttpOnly_/, '').split('\t');
        return { name, value, domain, path: cookiePath, secure: secure === 'TRUE', httpOnly: line.startsWith('#HttpOnly_'), ...(Number(expires) > 0 ? { expires: Number(expires) } : {}) };
      });
      if (!cookies.length) throw new Error('Missing Preview access cookie');
      await context.addCookies(cookies);
    }
    const page = await context.newPage();
    page.on('pageerror', error => run.errors.push(error.message));
    page.on('requestfailed', request => run.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => { const headers = response.headers(); run.responses.push({ url: response.url(), status: response.status(), cache: headers['x-vercel-cache'] ?? headers['age'] ?? null }); });
    await page.route('**/*', route => new URL(route.request().url()).origin === url.origin ? route.continue() : (run.errors.push(`External request blocked: ${route.request().url()}`), route.abort()));
    try {
      const destination = new URL('/virtualization-benchmark.html', url);
      destination.search = new URLSearchParams({ mode, count }).toString();
      await page.goto(destination.href, { waitUntil: 'networkidle', timeout: 60000 });
      await page.locator('[data-benchmark-feed]').waitFor({ timeout: 30000 });
      const first = await settle(page);
      if (first.loaded !== count || first.filtered !== count) throw new Error('Fixture count mismatch');
      run.warmupStartedAt = new Date().toISOString();
      for (const fraction of [0, 0.25, 0.5, 0.75, 1, 0]) {
        await page.locator('[data-benchmark-feed]').evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
        await settle(page);
      }
      run.warmupFinishedAt = new Date().toISOString();
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        for (let attempt = 0; attempt < 3; attempt++) {
          await page.locator('[data-benchmark-feed]').evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; }, fraction);
          await settle(page);
        }
        const sample = { position: fraction, ...await snapshot(page) };
        if (!sample.visibleIds.length || !sample.visibleImagesReady) throw new Error('Blank or unloaded visible region');
        if (mode === 'all' && sample.cards !== count) throw new Error('Nonvirtual mode missing cards');
        run.samples.push(sample);
        await page.screenshot({ path: path.join(output, 'screenshots', `${id}-${fraction}.png`) });
      }
      // Structural sampling only; DOM queries here are never used for timing claims.
      const distance = (await snapshot(page)).scrollTop;
      for (let step = 1; step <= 100; step++) {
        await page.locator('[data-benchmark-feed]').evaluate((el, top) => { el.scrollTop = top; }, distance * (1 - step / 100));
        await page.waitForTimeout(100);
        run.samples.push({ position: 'return', ...await snapshot(page) });
      }
      await settle(page);
      const visibleId = (await snapshot(page)).visibleIds[0];
      await page.locator(`[data-photo-id="${visibleId}"]`).click();
      await page.waitForTimeout(300);
      run.clickCheck = { photoId: visibleId, selectedId: await page.locator('[data-benchmark-feed]').getAttribute('data-selected-photo-id'), modalImageVisible: await page.locator('img[data-image-variant]').isVisible() };
      if (run.clickCheck.selectedId !== visibleId || !run.clickCheck.modalImageVisible) throw new Error('Photo click did not open matching modal');
      run.continuousBlankSamples = run.samples.filter(s => s.position === 'return' && (!s.visibleIds.length || !s.visibleImagesReady)).length;
      if (run.continuousBlankSamples) throw new Error('Blank or unloaded region during return');
      run.maxCards = Math.max(...run.samples.map(s => s.cards));
      if (run.errors.length || run.responses.some(r => r.status >= 400)) throw new Error('Runtime or resource errors');
      run.valid = true;
    } catch (error) { run.failure = error.message; }
    finally {
      run.finishedAt = new Date().toISOString();
      runs.push(run);
      writeFileSync(path.join(output, 'raw-runs.json'), JSON.stringify(runs, null, 2));
      writeFileSync(path.join(output, 'run-manifest.json'), JSON.stringify(runs.map(({ samples, responses, ...rest }) => rest), null, 2));
      await context.close();
      console.log(JSON.stringify({ id, valid: run.valid, maxCards: run.maxCards, failure: run.failure }));
    }
  }
} finally { await browser.close(); }
writeFileSync(path.join(output, 'summary.csv'), 'id,valid,maxCards,failure\n' + runs.map(r => [r.id, r.valid, r.maxCards ?? '', JSON.stringify(r.failure ?? '')].join(',')).join('\n'));
if (runs.some(r => !r.valid)) process.exitCode = 1;
