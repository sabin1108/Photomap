const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const baseUrl = process.env.PHOTOMAP_BASE_URL || 'http://127.0.0.1:4173/';
const outputPath = process.env.PHOTOMAP_PROFILE_OUTPUT;

test('capture map React Profiler data', async ({ page }) => {
  test.skip(!outputPath, 'PHOTOMAP_PROFILE_OUTPUT is required');

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '지도', exact: true }).click();
  await expect(page.locator('iframe[title="Unity Mapbox View"]')).toBeVisible();
  await page.waitForTimeout(8_000);

  const profile = await page.evaluate(() => window.__PHOTOMAP_EXPORT_PROFILER__?.());
  expect(profile).toBeTruthy();
  fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2), 'utf8');
});
