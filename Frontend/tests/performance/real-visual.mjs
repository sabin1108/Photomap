import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
const arg = (key, fallback) => { const i = process.argv.indexOf(`--${key}`); return i < 0 ? fallback : process.argv[i + 1]; };
const output = path.resolve(arg('output', 'benchmark-results/real-ux-2026-09-10/visual'));
const target = new URL(arg('target', 'http://127.0.0.1:4187'));
const pairs = Number(arg('pairs', '30'));
const count = Number(arg('count', '1000'));
const cpu = Number(arg('cpu', '1'));
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || existsSync(path.join(output, 'protocol.json'))) throw Error('Local target and new directory required');
mkdirSync(path.join(output, 'frames'), { recursive: true });
const protocol = { pairs, count, cpu, scope: 'isolated PhotoFeed', phase: 'separate screenshot diagnostics', viewport: { width: 390, height: 844 }, dpr: 2, cache: 'same-context warm path and modal', reference: 'stable correct modal capture verified against expected fixture URL and ID, compare central60% of image area', matchMeanAbsoluteError: 8, captureGapMs: 0, timeoutMs: 5000, primary: 'capture-end UTC minus trusted click event UTC; capture start/end bracket retained; NOT physical display latency', limitations: 'Screenshots perturb timing. Source URL and ID verified separately. No human inter-rater validation. Central crop matching may miss changes outside crop.', seed: 20260910 };
writeFileSync(path.join(output, 'protocol.json'), JSON.stringify(protocol, null, 2));
let seed = protocol.seed; const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2 ** 32; };
const orders = Array.from({ length: pairs }, (_, i) => i % 2 ? ['virtual', 'all'] : ['all', 'virtual']);
for (let i = orders.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [orders[i], orders[j]] = [orders[j], orders[i]]; }
const schedule = orders.flatMap((modes, i) => modes.map(mode => ({ pair: i + 1, mode, id: `${i + 1}-${mode}` })));
writeFileSync(path.join(output, 'schedule.json'), JSON.stringify(schedule, null, 2));
const browser = await chromium.launch({ headless: true });
const results = [];
async function wheel(cdp, sign) { for (let i = 0; i < 60; i++) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 422, deltaX: 0, deltaY: sign * 30 }); await sleep(50); } await sleep(100); }
async function press(cdp) { await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 195, y: 422, button: 'left', clickCount: 1 }); await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 195, y: 422, button: 'left', clickCount: 1 }); }
async function pixels(buffer) { return sharp(buffer).resize(64, 64).removeAlpha().raw().toBuffer(); }
function difference(a, b) { let total = 0; for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]); return total / a.length; }
try {
  for (const spec of schedule) {
    const run = { ...spec, samples: [], errors: [], success: false };
    const context = await browser.newContext({ viewport: protocol.viewport, deviceScaleFactor: 2 });
    const page = await context.newPage(); const cdp = await context.newCDPSession(page);
    page.on('pageerror', e => run.errors.push(e.message));
    try {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      await page.goto(new URL(`/virtualization-benchmark.html?mode=${spec.mode}&count=${count}&fixture=real`, target).href, { waitUntil: 'networkidle' });
      await wheel(cdp, 1); await sleep(300);
      run.expectedId = await page.evaluate(() => document.elementFromPoint(195, 422)?.closest('[data-photo-id]')?.getAttribute('data-photo-id'));
      if (!run.expectedId) throw Error('No expected card');
      run.expectedTop = await page.locator('[data-benchmark-feed]').evaluate(e => e.scrollTop);
      await press(cdp);
      await page.waitForFunction(id => { const modal = document.querySelector('[data-photo-modal-id]'); const img = modal?.querySelector('img[data-image-variant]'); return modal?.getAttribute('data-photo-modal-id') === id && img?.getAttribute('data-image-variant') === 'full' && img.complete && img.naturalWidth > 0; }, run.expectedId);
      await sleep(250);
      const img = page.locator('[data-photo-modal-id] img[data-image-variant]');
      run.reference = await img.evaluate(async e => { await e.decode(); return { url: e.currentSrc, modalId: e.closest('[data-photo-modal-id]').dataset.photoModalId }; });
      const manifest = await page.evaluate(() => fetch('/real-fixtures/v1/fixture-manifest.json').then(r => r.json()));
      const index = (Number(run.expectedId.replace('fixture-', '')) - 1) % 1000;
      if (new URL(run.reference.url).pathname !== manifest.fixtures[index].url) throw Error('Reference source differs from fixture');
      const box = await img.boundingBox();
      const clip = { x: box.x + box.width * .2, y: box.y + box.height * .2, width: box.width * .6, height: box.height * .6 };
      run.clip = clip;
      const referenceBuffer = await page.screenshot({ clip });
      writeFileSync(path.join(output, 'frames', `${spec.id}-reference.png`), referenceBuffer);
      const reference = await pixels(referenceBuffer);
      await page.getByRole('button', { name: 'Close', exact: true }).filter({ visible: true }).click();
      await wheel(cdp, -1); await sleep(200);
      await page.evaluate(() => { window.visualClick = null; document.addEventListener('click', e => { if (e.target.closest('[data-photo-id]')) window.visualClick = { at: performance.timeOrigin + e.timeStamp, received: performance.timeOrigin + performance.now(), id: e.target.closest('[data-photo-id]').dataset.photoId, trusted: e.isTrusted }; }, true); });
      await wheel(cdp, 1);
      run.actualTop = await page.locator('[data-benchmark-feed]').evaluate(e => e.scrollTop);
      if (Math.abs(run.actualTop - run.expectedTop) > 60) throw Error('Visual path mismatch');
      // Capture-off comparison is recorded separately by the timing runner; these are only capture diagnostics.
      run.pressSentAt = Date.now();
      const input = press(cdp);
      const deadline = Date.now() + 5000;
      let previousEnd = null;
      while (Date.now() < deadline) {
        const start = Date.now(); const buffer = await page.screenshot({ clip }); const end = Date.now();
        const mae = difference(await pixels(buffer), reference);
        const frame = `${spec.id}-${run.samples.length}.png`;
        writeFileSync(path.join(output, 'frames', frame), buffer);
        run.samples.push({ start, end, gapSincePreviousEnd: previousEnd === null ? null : start - previousEnd, mae, frame });
        previousEnd = end;
        if (mae <= protocol.matchMeanAbsoluteError) { run.firstMatch = run.samples.at(-1); break; }
      }
      await input;
      run.click = await page.evaluate(() => window.visualClick);
      run.selectedId = await page.locator('[data-photo-modal-id]').getAttribute('data-photo-modal-id');
      run.success = !!run.firstMatch && run.click?.trusted && run.click.id === run.expectedId && run.selectedId === run.expectedId && run.errors.length === 0;
      if (run.success) { run.captureEndLatencyMs = run.firstMatch.end - run.click.at; run.captureStartLatencyMs = run.firstMatch.start - run.click.at; }
      else run.failure = 'No matching capture or selection mismatch';
    } catch (e) { run.failure = e.message; }
    finally {
      results.push(run); writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
      await context.close(); console.log(JSON.stringify({ id: spec.id, success: run.success, latency: run.captureEndLatencyMs, failure: run.failure }));
    }
  }
} finally { await browser.close(); }
if (results.some(r => !r.success)) process.exitCode = 1;
