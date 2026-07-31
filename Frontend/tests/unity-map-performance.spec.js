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
