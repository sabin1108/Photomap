const { test, expect } = require('@playwright/test');

const baseUrl = process.env.PHOTOMAP_BASE_URL || 'https://photomap-three.vercel.app/';

test('map previews stay visible and drive map focus', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '지도', exact: true }).click();

  const previewList = page.getByTestId('map-photo-preview-list');
  await expect(previewList).toBeVisible({ timeout: 20_000 });

  const previewButtons = previewList.getByRole('button', { name: /위치로 이동$/ });
  await expect(previewButtons.first()).toBeVisible();
  expect(await previewButtons.count()).toBeGreaterThan(1);

  await expect(page.getByTestId('map-focus-status')).toContainText('지도 이동 완료', {
    timeout: 30_000,
  });

  const secondPreview = previewButtons.nth(1);
  await secondPreview.click();
  await expect(secondPreview).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('map-focus-status')).toContainText('지도 이동 완료', {
    timeout: 30_000,
  });

  await page.getByRole('button', { name: '사진 상세 보기' }).click();
  await expect(page.getByRole('button', { name: 'Close' }).first()).toBeVisible();
});
