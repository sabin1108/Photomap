const { test, expect } = require('@playwright/test');

const baseUrl = 'http://127.0.0.1:4191';

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.abort('failed'));
});

test('favorites view restores tag filter and recovers to all photos', async ({ page }) => {
  await page.goto(baseUrl);

  await page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true }).press('Enter');
  await page.getByRole('button', { name: '좋아요', exact: true }).click();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '좋아요', exact: true }).click();
  await expect(page.getByRole('heading', { name: '좋아요', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Bangkok Night Road', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '자연', exact: true }).click();
  await expect(page).toHaveURL(/favoriteTag=/);
  await expect(page.getByRole('img', { name: 'Bangkok Night Road', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: '자연', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '필터 지우기', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Bangkok Night Road', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Bangkok Night Road 상세 보기', exact: true }).press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: '좋아요 취소', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-photo-feed] img')).toHaveCount(0);
  await page.getByRole('button', { name: '전체 사진 보기', exact: true }).click();
  await expect(page).toHaveURL(/(?:\?|&)view=all(?:&|$)|http:\/\/127\.0\.0\.1:4191\/?$/);
});
