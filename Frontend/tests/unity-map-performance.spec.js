const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const runtimePath = path.join(__dirname, '..', 'public', 'unity-map', 'index.html');

test('map interaction does not encode Unity backgrounds on every move frame', () => {
  const runtime = fs.readFileSync(runtimePath, 'utf8');

  expect(runtime).not.toContain('handleMapInteraction()');
  expect(runtime).not.toMatch(/map\.on\(['"]zoom['"],\s*\(\)\s*=>\s*\{\s*updateUnityPosition/);
  expect(runtime).toContain("map.on('render', updateUnityPosition)");
  expect(runtime).toContain("map.on('moveend', captureActiveBackground)");
});

test('repeated wheel events close the Unity carousel only once', () => {
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const closeUnityBody = runtime.match(/function closeUnity\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';

  expect(closeUnityBody).toContain("if (!container.classList.contains('active')) return;");
});

test('initial map load defers Unity WebGL until a photo requests it', () => {
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const mapView = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'Map2DView.tsx'),
    'utf8'
  );

  expect(runtime).not.toContain('@supabase/supabase-js');
  expect(runtime).toContain('function ensureUnityLoaded()');
  expect(runtime).toContain('ensureUnityLoaded().then');
  expect(runtime).toMatch(/#unity-loading-bar[\s\S]*?display:\s*none/);
  expect(mapView).not.toContain('setShouldLoadIframe');
  expect(mapView).toContain('src="/unity-map/index.html"');
});

test('iframe readiness can be recovered after the initial signal is missed', async ({ page }) => {
  const runtime = fs
    .readFileSync(runtimePath, 'utf8')
    .replace(/\s*<link href="https:\/\/api\.mapbox\.com[^>]+>/, '')
    .replace(/\s*<script src="https:\/\/api\.mapbox\.com[^>]+><\/script>/, '');

  await page.setContent('<iframe id="map-frame"></iframe>');

  const recovered = await page.evaluate(async (iframeHtml) => {
    const frame = document.querySelector('#map-frame');
    const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    frame.srcdoc = iframeHtml;
    await loaded;
    await new Promise(resolve => window.setTimeout(resolve, 50));

    return new Promise(resolve => {
      const timeout = window.setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(false);
      }, 250);
      const handleMessage = (event) => {
        if (event.source !== frame.contentWindow || event.data?.type !== 'IFRAME_READY') return;
        window.clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
        resolve(true);
      };

      window.addEventListener('message', handleMessage);
      frame.contentWindow.postMessage({ type: 'REQUEST_IFRAME_READY' }, '*');
    });
  }, runtime);

  expect(recovered).toBe(true);
});

test('ready iframe receives one payload without source-event marker churn', () => {
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const mapView = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'Map2DView.tsx'),
    'utf8'
  );
  const delayedPayloadSends = mapView.match(/setTimeout\(sendUpdate/g) ?? [];

  expect(delayedPayloadSends).toHaveLength(0);
  expect(mapView).not.toContain('retryTimers');
  expect(runtime).not.toContain("map.on('sourcedata', scheduleMarkerUpdate)");
  expect(runtime).toContain("map.on('idle', scheduleMarkerUpdate)");
  expect(runtime).toContain("map.on('moveend', scheduleMarkerUpdate)");
});
